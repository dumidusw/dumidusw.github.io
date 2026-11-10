---
layout: post
title: "MITM Trust, Take Two: Why Python Needed a Different Design Than Brave"
date:   2026-11-10 00:00:00 +0530
categories: [testing, automation]
description: How I built mitmpy, a small wrapper that routes one Python process through mitmproxy without touching the shell or system trust store, and why Brave needed a different design.
image: /assets/images/posts/mitm-proxy-and-brave-profiles.png
---
In my last post, I wrote about getting mitmproxy to work with an isolated Brave profile without leaving a MITM certificate permanently trusted on my machine.
That solved half the problem.
Most of my actual work isn't clicking around in a browser.
<!--more-->
It's scraping, automation, API testing, and curriculum examples, all in Python. If I wanted to inspect that traffic the same way, I needed something like this:
```
Python
   │
   ▼
mitmproxy
127.0.0.1:8080
   │
   ▼
Internet
```

I assumed this would be a smaller version of the Brave problem. It wasn't.
It turned out to be a much simpler problem, for a reason that took me a moment to articulate.

## The tempting first instinct
The obvious move is to export the proxy variables globally:

```python
export HTTPS_PROXY=http://127.0.0.1:8080
export HTTP_PROXY=http://127.0.0.1:8080
export REQUESTS_CA_BUNDLE="$HOME/.mitmproxy/mitmproxy-ca-cert.pem"
```

Drop that into `.zshrc`, and Python processes launched from that shell inherit the configuration.
That's also exactly the problem.
Once these variables are exported, subsequent commands inherit the settings whether or not I intended them to use mitmproxy:

That's also exactly the problem.
Once these variables are exported, subsequent commands inherit the settings whether or not I intended them to use mitmproxy:

```
Python
 ├── scraper.py             → MITM ✓
 ├── API experiment         → MITM ✓
 ├── requests lesson        → MITM ✓
 ├── pip install ...        → MITM ?
 ├── unrelated Python tool  → MITM ?
 └── production script      → MITM ?
```

There is no obvious indication, just from looking at an individual command, that it has inherited a proxy configuration from an earlier experiment.
A pip install unexpectedly routing through a local proxy isn't necessarily dangerous, but it isn't something I want happening without making that decision myself. A production script picking up a debugging proxy because I forgot to unset a variable is a genuinely undesirable failure mode.
I had already solved a version of this problem for Brave. I assumed I could reuse the same design.
I was wrong, and the reason why turned out to be the interesting part.

## Python isn't Brave
The Brave setup needed real lifecycle management.
Chromium's certificate handling involves browser-specific state, and certificate trust in an isolated profile didn't give me the persistence and cleanup guarantees I wanted. That was why the final design from the previous article needed a wrapper script with a lock file, an EXIT trap, and explicit cleanup.
The architecture looked like this:

```
Brave
  │
  ├── Isolated profile
  ├── System CA trust temporarily modified
  └── Cleanup required on exit
```

Python's HTTP libraries give me another option.
For a typical Python script using requests, I can configure proxy and certificate settings through environment variables. The process reads those settings when it runs, so the wrapper doesn't need to modify the calling shell or the system trust store.
The distinction is not that Python applications can never maintain persistent state. They certainly can. It's that my Python workflow can achieve its goal through process-level configuration, whereas my Brave workflow needs browser-specific trust and lifecycle management.
That leads to two different designs:

That leads to two different designs:

```
Brave
  → Browser-specific trust and profile state
  → Requires lifecycle management

Python
  → Process-level proxy and CA configuration
  → Requires controlled environment inheritance
```

The Brave solution wasn't complicated because MITM is inherently complicated. It was complicated because of the particular trust and lifecycle behavior I needed to manage.
For Python, I could use a much smaller mechanism: configure the process I wanted to inspect and leave everything else alone.

## Designing mitmpy
The whole tool is simple:
Run one Python process with a MITM-configured environment, without modifying the environment of the shell that launched it.
I called it mitmpy.
**Version 1**: Hardcoded configuration
The first version was deliberately minimal:

```bash
#!/bin/bash

HTTPS_PROXY=http://127.0.0.1:8080 \
HTTP_PROXY=http://127.0.0.1:8080 \
REQUESTS_CA_BUNDLE="$HOME/.mitmproxy/mitmproxy-ca-cert.pem" \
SSL_CERT_FILE="$HOME/.mitmproxy/mitmproxy-ca-cert.pem" \
python "$@"
```

The important part is python "$@", not python "$1".
In Bash, quoted "$@" expands to the original positional arguments as separate words. That means the wrapper isn't limited to running a Python script by filename. It also supports commands such as:

```
mitmpy scraper.py
mitmpy -m pytest
mitmpy -m pytest tests/
mitmpy -m http.server 8000
```

The proxy configuration is an execution-environment concern. It shouldn't leak into the Python code itself. The lesson code stays exactly as simple as it should be:

```python
import requests

response = requests.get("https://example.com")
```

No proxies= argument. No session.proxies = .... The script doesn't need to know that its traffic is being inspected.

### Version 2

Hardcoding the proxy address and certificate path was fine for the first version, but I wanted to support different configurations without editing the script.
I introduced two environment variables:

```bash
MITMPY_PROXY="${MITMPY_PROXY:-127.0.0.1:8080}"
MITMPY_CA="${MITMPY_CA:-$HOME/.mitmproxy/mitmproxy-ca-cert.pem}"
```

The default case remains trivial:

```
mitmpy scraper.py
```

But a one-off override is now possible:

```bash
MITMPY_PROXY=127.0.0.1:9090 mitmpy scraper.py
MITMPY_CA=/path/to/other-ca.pem mitmpy scraper.py
```

The :- expansion supplies the default when the variable is unset or empty.

### Version 3: Fail early when the CA is missing
The CA certificate is a file that mitmproxy generates the first time it runs. It isn't necessarily present right after installation, and without a check a fresh setup fails later with an SSL error that doesn't make the missing prerequisite obvious.
I added a simple guard:


```bash
if [[ ! -f "$MITMPY_CA" ]]; then
    echo "mitmpy: mitmproxy CA certificate not found:" >&2
    echo "        $MITMPY_CA" >&2
    echo "        Start mitmproxy once to generate its CA certificate." >&2
    exit 1
fi
```

I deliberately didn't add a check for whether the proxy itself is listening. If mitmproxy isn't running, the Python client will report a connection failure to the configured proxy, and that is an honest and sufficient error for this tool.
Checking proxy availability would mean taking responsibility for something outside mitmpy's job. It would also raise questions about IPv4 versus IPv6 loopback, startup timing, and what should happen if the proxy comes up a moment after the check.

The scope is narrow on purpose:

```
             mitmpy
                │
       ┌────────┴────────┐
       │                 │
  CA file exists?   Configure environment
       │                 │
      Yes                │
       │                 ▼
       └────────────► Launch Python
```

### Version 4: Don't let inherited settings interfere
The last problem only shows up in practice. If my shell already has ALL_PROXY or NO_PROXY set for some other reason, those can change where a request goes even though mitmpy set the proxy variables correctly. NO_PROXY is the nastier one, because it can silently route a destination around mitmproxy.
So the wrapper clears ALL_PROXY and sets NO_PROXY explicitly. The default is an empty bypass list, so nothing skips the proxy unless I ask for it:

```bash
MITMPY_NO_PROXY=localhost,127.0.0.1 mitmpy scraper.py
```

That keeps the configuration symmetrical. Proxy, CA, and bypass list are all decided per invocation, and none of them depend on what some earlier command left in the shell.
It also means a script that talks to a local service will send that traffic through mitmproxy too, unless I opt out with MITMPY_NO_PROXY. For a tool whose job is to show me traffic, I'd rather see it by default.

### The final script

```bash
#!/bin/bash

# mitmpy — run Python through a local mitmproxy instance.
#
# This script does not:
#   - modify the Python installation
#   - modify the system trust store
#   - modify the calling shell's environment
#
# Proxy and CA configuration are scoped to the launched
# Python process and any child processes that inherit its
# environment.

MITMPY_PROXY="${MITMPY_PROXY:-127.0.0.1:8080}"
MITMPY_CA="${MITMPY_CA:-$HOME/.mitmproxy/mitmproxy-ca-cert.pem}"

if [[ ! -f "$MITMPY_CA" ]]; then
    echo "mitmpy: mitmproxy CA certificate not found:" >&2
    echo "        $MITMPY_CA" >&2
    echo "        Start mitmproxy once to generate its CA certificate." >&2
    exit 1
fi

# Clear ALL_PROXY so it can't compete with the explicit settings,
# and set NO_PROXY explicitly (empty unless MITMPY_NO_PROXY is given).
exec env \
    -u ALL_PROXY -u all_proxy \
    HTTP_PROXY="http://$MITMPY_PROXY" \
    HTTPS_PROXY="http://$MITMPY_PROXY" \
    http_proxy="http://$MITMPY_PROXY" \
    https_proxy="http://$MITMPY_PROXY" \
    NO_PROXY="${MITMPY_NO_PROXY:-}" \
    no_proxy="${MITMPY_NO_PROXY:-}" \
    REQUESTS_CA_BUNDLE="$MITMPY_CA" \
    SSL_CERT_FILE="$MITMPY_CA" \
    python "$@"
```

The proxy variables are set in both uppercase and lowercase because HTTP clients don't all interpret them identically. Some recognize both, and some give lowercase precedence.
The exec replaces the wrapper process with Python. It doesn't modify the parent shell, and there is no cleanup routine to run when Python exits.
Notice what's absent:
• No installation step.
• No system trust-store modification.
• No cleanup step.
• No trap handlers.
• No lock file.
For this workflow, the environment is the configuration boundary.

### Using it
Save the script as mitmpy (no .sh extension, since I want to type it as a command), make it executable, and put it on my PATH:

```bash
chmod +x mitmpy
mkdir -p ~/.local/bin
ln -s "$(pwd)/mitmpy" ~/.local/bin/mitmpy
```

The symlink keeps the real file inside my dotfiles repo while exposing it as a normal command.
The workflow uses two terminals. In the first, start mitmproxy. I use mitmweb for the browser UI:

```bash
mitmweb
```

In the second, run Python through the wrapper:

```bash
mitmpy main.py
```

The request appears in mitmweb at 127.0.0.1:8081. Run mitmproxy at least once before the first mitmpy call, because that is when the CA certificate is generated.

One detail worth knowing: the wrapper runs whatever python resolves to on PATH. Inside an activated virtual environment, that is the venv's interpreter, so mitmpy works with a project's own installed packages without any extra configuration.

### Not every library agrees on the environment
At one point, I nearly wrote that "Python supports proxy environment variables" as a blanket statement.
That isn't quite true. Environment variables for proxy and CA configuration aren't a universal Python language feature. They're conventions implemented by individual libraries and the networking components underneath them.

Here is how the common HTTP clients are documented to behave:

| Library | Proxy configuration | CA configuration |
|---|---|---|
| `requests` | Reads proxy environment variables by default | `REQUESTS_CA_BUNDLE` |
| `httpx` | Reads proxy environment variables by default (`trust_env=True`) | `SSL_CERT_FILE`, or an explicit `verify=` |
| `urllib.request` | Discovers proxies from environment variables | Python's default SSL context, which follows OpenSSL's default paths (`SSL_CERT_FILE`) |
| `aiohttp` | Only when the session is created with `trust_env=True` | Default context follows OpenSSL's default paths; an explicit SSL context overrides it |
| `curl_cffi` | Has a `trust_env` option; check your installed version | Its own certificate and verify settings |

The details matter. aiohttp doesn't consume proxy environment variables unless I opt in:

```python
async with aiohttp.ClientSession(trust_env=True) as session:
    async with session.get("https://example.com") as response:
        print(response.status)
```

With that one flag, the same environment that requests already used starts working. Likewise, an httpx client created with trust_env=False ignores it.
A table built from documentation is only a claim, though. The more convincing version is to test each library under the wrapper and see which ones show up in mitmweb. A small probe script does that:

```python
# probe.py
import sys

url = "https://example.com"
lib = sys.argv[1]

if lib == "requests":
    import requests
    print(requests.get(url).status_code)
elif lib == "httpx":
    import httpx
    print(httpx.get(url).status_code)
elif lib == "urllib":
    import urllib.request
    print(urllib.request.urlopen(url).status)
elif lib == "aiohttp":
    import asyncio, aiohttp

    async def main():
        async with aiohttp.ClientSession(trust_env=True) as s:
            async with s.get(url) as r:
                print(r.status)

    asyncio.run(main())
elif lib == "curl_cffi":
    from curl_cffi import requests as cr
    print(cr.get(url).status_code)
```

A flow in mitmweb means that library used the proxy. A certificate error is also a result: it means the request reached mitmproxy but the library didn't trust the CA, or that the library ignored the proxy and verification failed for another reason. Either way, I learn what that library actually does with this environment instead of what its documentation suggests.
This is why I wouldn't describe mitmpy as a universal Python interception tool. It's a process-environment wrapper. Whether a particular request uses the proxy and trusts the CA depends on the HTTP library and how it was configured.
That distinction is especially useful when teaching requests and aiohttp side by side. The same environment produces different behavior because the libraries make different decisions, which is the habit I try to build throughout my networking curriculum: understand the mechanism, not just the API surface.

### A note about CA files and certificate verification

The final script sets both REQUESTS_CA_BUNDLE and SSL_CERT_FILE to the same file, and that file deserves a plain explanation.
mitmproxy-ca-cert.pem contains only mitmproxy's own CA. It is not a bundle of public root certificates.
That is fine for the intended path. The client connects to mitmproxy, mitmproxy opens its own connection to the destination, and it presents the client with a certificate signed by the mitmproxy CA. The client trusts that CA, so verification succeeds.
The consequence is that any HTTPS connection that bypasses the proxy will fail certificate verification, because the client no longer has the public roots it needs to validate the real server. That includes destinations excluded through MITMPY_NO_PROXY, libraries that ignore the proxy variables, and anything that connects directly.
For my controlled interception workflow that is acceptable, and arguably useful: a request that skips the proxy fails loudly instead of quietly going unobserved. But it is a trade-off, not a universal recommendation. A workflow that needs both intercepted and direct HTTPS would need a combined bundle containing the mitmproxy CA and the public roots.
The wrapper also doesn't override every TLS setting. A library can use an explicit SSL context, a custom CA bundle, or its own configuration instead, and mitmpy doesn't attempt to fight those decisions.

### Proof, in both directions
With the wrapper in place, I tested the behavior in mitmweb.
Running a plain requests.get() through mitmpy showed up immediately:

```
GET https://www.google.com/ HTTP/1.1
Host: www.google.com
User-Agent: python-requests/2.34.2
```

That was the easy half of the test. The half that actually mattered was what happened without mitmpy:

```
mitmpy main.py   → Flow captured in mitmweb
python main.py   → No new flow
```

The first run proves that the intended Python process can use the proxy and have its traffic captured. The second tests the isolation property: running ordinary Python immediately afterward, in the same terminal, doesn't inherit the wrapper's configuration.
The goal was never simply to prove that Python traffic could be intercepted, because mitmproxy already does that. The goal was to make interception an explicit choice for each invocation, without leaving proxy configuration behind in the calling shell.
These tests establish that behavior for the tested script and environment. They don't prove that every Python library behaves identically, which is exactly what the probe script above is for.

### Where this stops being enough
If Python automation actually means Selenium or Playwright driving a real Chromium or Brave instance, mitmpy isn't the solution.
At that point, the browser is the HTTP client, not requests or httpx. The fact that Python launched the browser doesn't make the browser use Python's HTTP-library configuration. The browser has its own networking stack, proxy behavior, and certificate-trust requirements.
That is where the earlier brave-mitm.sh approach becomes relevant again:

```
Python requests / httpx
        │
        ▼
     mitmpy
        │
        ▼
    mitmproxy


Python + Playwright / Selenium
        │
        ▼
   Browser process
        │
        ▼
 Browser-specific proxy and
 certificate configuration
```

The language used to launch a client doesn't determine which trust mechanism that client uses. mitmpy configures a Python process's environment. It doesn't manage browser profiles or browser-specific certificate trust.

### The broader lesson
The principle is the same as in the previous article: trust and configuration should exist only for as long as they're needed, rather than becoming permanent standing decisions.
But the implementation is different because the two problems have different boundaries. For Brave, I needed to manage browser-specific trust and lifecycle behavior. For Python, I could use a short-lived process environment without touching the calling shell or the system trust store.
The resulting tools are deliberately different:

```
brave-mitm.sh
  → Manages browser isolation and certificate lifecycle

mitmpy
  → Configures one process's proxy and CA environment
```

Both scripts now live next to each other:

```
scripts/mitm/
├── brave-mitm.sh
└── mitmpy
```

Same underlying goal. Two different designs.

The important lesson wasn't to build a reusable framework that handles every kind of client. It was to understand how each client behaves, find the narrowest configuration boundary that solves the problem, and avoid introducing lifecycle management where it isn't needed.
Sometimes the right security design needs locks, traps, and cleanup.
Sometimes it needs a small wrapper around python "$@".
The difference is knowing which problem you're actually solving.
