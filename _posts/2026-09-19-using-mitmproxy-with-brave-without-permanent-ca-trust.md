---
layout: post
title: "Using mitmproxy with Brave Without Permanent CA Trust"
date:   2026-09-19 00:00:00 +0530
categories: [projects]
description: Learn how I made mitmproxy's CA trust temporary in an isolated Brave profile on Arch Linux, using the system trust store and a wrapper script that automatically removes the CA when the MITM session ends.
image: /assets/images/posts/mitm-proxy-and-brave-profiles.png
---

Recently I wanted to install mitmproxy on my one of my Arch Linux machines because I wanted to inspect HTTPS traffic while working on some scraping and automation projects.

Installing mitmproxy itself took only a few minutes, but getting Brave browser to trust mitmproxy's certificate took much longer.

The interesting part wasn't the final fix. The interesting part was figuring out which layer was actually causing the problem.

<!--more-->

In this post I'm not going to talk about "What is mitmproxy" or "how to install it". This is more about troubleshooting a problem where the first few solutions seem reasonable, but are actually fixing the wrong thing.

---

Okay this is the setup I wanted

My goal was simple:

```
Brave
   │
   │ HTTPS
   ▼
mitmproxy
127.0.0.1:8080
   │
   ▼
Internet

```

I wanted to use a separate Brave profile for MITM testing. Because I use separate brave profiles as web apps on my arch computer.

That way, my normal browsing profile would remain separate. The MITM profile would have its own cookies, extensions, storage, and browsing state. So I would simply operate it using hyprland and rofi.

I also wanted this profile to trust mitmproxy's CA certificate so that mitmproxy could decrypt HTTPS connections.

The mitmproxy side worked immediately.

But.. certificate trust did not.

---

Attempt 1: Import the certificate through Brave

Brave has a certificate manager at:

```
brave://certificate-manager
```

There is an option to import a certificate under Trusted Certificates.

So I imported:

```
~/.mitmproxy/mitmproxy-ca-cert.pem
```

It worked.

I opened a website, and everything looked good. mitmproxy was able to intercept the HTTPS connection and show me the decrypted traffic.

So I closed Brave.

Then I opened the MITM profile again.

The certificate warning was back:

```
NET::ERR_CERT_AUTHORITY_INVALID
```

It was as if I had never imported the certificate.

---

Attempt 2: Maybe mitmproxy generated a new CA?

My first theory was that mitmproxy had generated a new CA certificate.

That would explain the problem.

If Brave trusted certificate A, but mitmproxy was now using certificate B, Brave would correctly reject it.

So I checked the certificate fingerprint:

```
openssl x509 \
    -in ~/.mitmproxy/mitmproxy-ca-cert.pem \
    -noout \
    -fingerprint \
    -sha256
```

I checked it several times, including after restarting mitmproxy and Brave.

The fingerprint stayed the same.

So the CA certificate itself was not changing.

That ruled out an entire category of possible problems.

The problem was probably not:

```
mitmproxy
    ↓
new CA certificate
```

It was more likely:

Brave
```
↓
```
didn't remember the trust decision

---

Attempt 3: Maybe one of my Brave launch options was causing it?

I was also using several Chromium command-line options for my MITM profile.

One of them was:

```
--ignore-certificate-errors-spki-list
```

That option is related to certificate handling and expects a value containing certificate hashes.

I had previously included it incorrectly, without giving it the expected value.

That made it a reasonable suspect.

So I removed it.

The problem remained.

At this point I had checked:

the CA certificate itself
the certificate fingerprint
the Brave launch options

But I had not checked the most basic question:

>Did Brave actually save the certificate import?

---

Checking the actual state

I opened:

```
brave://certificate-manager/localcerts/usercerts
```

And there were:

No certificates.

That was the important discovery.

The certificate import had worked during that Brave session, but it wasn't still there after the browser was restarted.

So all my previous theories were looking in the wrong direction.

I wasn't dealing with a certificate mismatch.

I wasn't dealing with a bad mitmproxy CA.

I wasn't dealing with a launch flag.

I was dealing with persistence.

---

Why wasn't the certificate being saved?

Brave stores information about certificate trust separately from the operating system's certificate store.

In my setup, the trust decision made through:

```
brave://certificate-manager
```

was associated with the Brave profile.

The important observation was that the imported certificate disappeared when the browser was terminated.

My setup also had two things that made this more likely to cause trouble:

Brave was installed as a Flatpak.
My Hyprland SUPER+Q shortcut used killactive, which terminates the application rather than asking it to perform a normal application shutdown.

So relying on Brave to successfully save this state during shutdown wasn't a good solution for my setup.

---

A partial fix: close Brave properly

I tried Brave's own exit shortcut:

```
Ctrl+Shift+W
```

This worked.

The certificate remained after restarting Brave.

So now I knew something important:

The certificate itself was fine. The problem was related to how the browser state was being persisted.

But this wasn't a solution I really liked.

I think a workflow shouldn't depend on remembering:

I wanted something that would work even if Brave was closed unexpectedly.

---

A different approach: use the system trust store

Instead of asking Brave to remember that it trusts mitmproxy's CA, I decided to put the CA into Arch's system-wide trust store.

I saw Arch Linux uses the trust utility (provided by the p11-kit package) as its primary tool for managing system-wide CA certificates and shared trust policies.

I installed the mitmproxy CA with:

```
sudo trust anchor --store ~/.mitmproxy/mitmproxy-ca-cert.pem
```

Now the certificate was trusted by the operating system.

Brave was already configured to use certificates trusted by the operating system, so it picked up the mitmproxy CA automatically.

This solved the persistence problem.

It no longer mattered how Brave was closed.

The trust decision was no longer stored inside Brave's profile.

It was stored at the operating-system level.

---

But now I had another problem

The system-wide solution worked, but it changed the security model.

Before:

```
MITM Brave profile
    ↓
trusts mitmproxy CA
```

After installing the CA system-wide:

```
System trust store
    ↓
mitmproxy CA trusted
    ↓
applications using the system trust store
```

That means the CA wasn't limited to my MITM Brave profile anymore.

My whole system could potentially trust that CA.

This isn't automatically dangerous.

The mitmproxy private key remained in:

```
~/.mitmproxy/
```

and nothing was automatically routed through mitmproxy.

But I still didn't like leaving a MITM CA permanently trusted on my machine.

My goal was to have this trust only when I was actually doing MITM testing.

That led to the final solution.

---

Treat the trust as a session

Instead of thinking:

"Install this CA permanently."

I changed the idea to:

"Install this CA when the MITM session starts, and remove it when the session ends."

So I created a small wrapper script around Brave.

The basic idea is:

```
Start script
     │
     ▼
Install mitmproxy CA
     │
     ▼
Start Brave
     │
     ▼
Use mitmproxy
     │
     ▼
Brave exits
     │
     ▼
Remove mitmproxy CA
     │
     ▼
Script exits
```

The important part is that the CA is now time-scoped.

It exists in the system trust store only while I am using the MITM environment.

---

The wrapper script

Here is the important part of my script:

```bash
#!/bin/bash
set -euo pipefail

PROFILE_DIR="$HOME/.local/share/brave-mitm-profile"
CERT_PATH="$HOME/.mitmproxy/mitmproxy-ca-cert.pem"

CA_INSTALLED=0

cleanup() {
    if (( CA_INSTALLED )); then
        echo "Removing mitmproxy CA from system trust..."
        pkexec trust anchor --remove "$CERT_PATH" 2>/dev/null || true
        echo "Done. System trust restored to normal."
    fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Installing mitmproxy CA..."
pkexec trust anchor --store "$CERT_PATH"
CA_INSTALLED=1

echo "Launching Brave MITM profile..."

flatpak run com.brave.Browser \
    --user-data-dir="$PROFILE_DIR" \
    --class="brave-mitm" \
    --proxy-server="127.0.0.1:8080"

```

There are a couple of important ideas here.

```
CA_INSTALLED
```

I use a variable to record whether this particular script actually installed the certificate:

```
CA_INSTALLED=0
```

After the installation succeeds:

```
pkexec trust anchor --store "$CERT_PATH"
CA_INSTALLED=1
```

The cleanup function checks that variable:

```
if (( CA_INSTALLED )); then
    ...
fi
```

Why?

Imagine the certificate installation fails.

Because the script uses:

```
set -e
```

the script exits.

The `EXIT trap` still runs.

Without `CA_INSTALLED`, the cleanup function would try to remove a certificate that this script never successfully installed.

That probably wouldn't cause a serious problem, but it would make the script's logic incorrect.

The flag makes the ownership explicit:

>Only clean up something that this invocation successfully created.

---

Why use an EXIT trap?

The cleanup is registered with:

```
trap cleanup EXIT
```

This means:

When the script's shell exits, run cleanup.

The important distinction is that the trap belongs to my script, not Brave.

The sequence is:

```
flatpak run Brave
       │
       │
       │ script waits here
       │
       ▼
Brave exits
       │
       ▼
flatpak run returns
       │
       ▼
script reaches the end
       │
       ▼
EXIT trap runs
       │
       ▼
cleanup()
       │
       ▼
CA removed
```

So it doesn't matter whether I close Brave normally or use a window-manager action that terminates it.

As long as the wrapper script itself gets to exit normally or through a handled signal, the EXIT trap performs the cleanup.

---

Handling `Ctrl+C` and `SIGTERM`

I also handle `INT` and `TERM`:

```
trap 'exit 130' INT
trap 'exit 143' TERM
```

The important idea here is that these handlers exit the script.

They don't perform the cleanup themselves.

Instead:

```
SIGINT
   ↓
exit 130
   ↓
EXIT trap
   ↓
cleanup
```

This gives the script one place responsible for cleanup:

```
trap cleanup EXIT
```

That is easier to reason about.

---

Preventing two MITM sessions

There is another problem I wanted to avoid.

Suppose I accidentally started the script twice:

```
Session A
    ↓
install CA
    ↓
Brave running
```

```
Session B
    ↓
install CA
    ↓
Brave running
```

Now Session A could close and remove the CA while Session B was still running.

So I added a lock:

```
LOCK_FILE="${XDG_RUNTIME_DIR:-/tmp}/brave-mitm.lock"

exec 200>"$LOCK_FILE"

if ! flock -n 200; then
    echo "Another brave-mitm.sh session is already running."
    exit 1
fi
```

The lock is held through file descriptor 200 for the entire lifetime of the script.

When the script exits, the file descriptor closes and the lock is automatically released.

So only one MITM session can use the temporary system trust at a time.

---

The final design

The complete architecture is now:

```

                    brave-mitm.sh
                          │
                          ▼
                   acquire lock
                          │
                          ▼
                  check CA exists
                          │
                          ▼
             install CA into system trust
                          │
                          ▼
                  CA_INSTALLED=1
                          │
                          ▼
                  launch Brave
                          │
             ┌────────────┴────────────┐
             │                         │
      isolated profile           mitmproxy
             │                  127.0.0.1:8080
             │                         │
             └────────────┬────────────┘
                          │
                          ▼
                    MITM testing
                          │
                          ▼
                     Brave exits
                          │
                          ▼
                   script exits
                          │
                          ▼
                    EXIT trap
                          │
                          ▼
                   remove CA
                          │
                          ▼
                  release lock

```

The result is what I wanted:

```
Normal browsing
    ↓
mitmproxy CA is NOT trusted


./brave-mitm.sh
    ↓
mitmproxy CA becomes temporarily trusted


MITM session
    ↓
Brave → mitmproxy → Internet


Brave/session ends
    ↓
mitmproxy CA is removed


Normal browsing
    ↓
mitmproxy CA is NOT trusted

```

The browser profile itself can remain on disk. Its cookies, storage, and settings can persist between sessions.

The trust, however, is temporary.

---

What I learned from this

The biggest lesson wasn't about mitmproxy.

It was about troubleshooting.

When something you configured disappears after a restart, the first question should often be:

Did the setting actually persist?

It's very tempting to immediately look for something that is interfering with the setting.

That's what I did.

I investigated:

whether mitmproxy generated a different certificate
whether the certificate fingerprint changed
whether my Brave launch options were wrong
whether certificate-error flags were interfering

Those were interesting possibilities.

But the boring question turned out to be the useful one:

Is the certificate still there?

Checking:

```
brave://certificate-manager/localcerts/usercerts
```

answered that immediately.

The certificate wasn't there.

That changed the entire direction of the investigation.

---

A broader lesson: settings versus sessions

There is another idea I took away from this.

Sometimes we treat permissions and trust as permanent settings because that is the easiest way to configure them.

But sometimes the better model is:

Make the permission exist only for as long as you need it.

In my case, I didn't really want:

"This computer trusts my MITM CA."

I wanted:

"This computer trusts my MITM CA
while I am running my MITM testing session."

Those sound similar, but they are very different designs.

A permanent permission might be perfectly safe enough for a particular situation.

But if you can make the permission temporary without making the workflow painful, that's usually a nicer security boundary.

For my MITM setup, the final solution is therefore not just "install the CA."

It is:

Start a controlled MITM session → temporarily establish trust → do the work → automatically remove the trust when the session ends.

That turned out to be a much better solution for the way I use Brave.

---

Got questions, corrections, or suggestions?

Open an issue on
[GitHub](https://github.com/dumidusw)
or email me at
dumidu.github@gmail.com.

There's no comment section on this blog, but I'm always happy to hear
from readers.
