---
layout: post
title:  "This is why I don't like NixOS"
date:   2026-08-04 10:00:00 +0530
categories: [nixos, arch-linux]
description: NixOS promises declarative, reproducible systems, but its abstraction over the filesystem hierarchy means you're learning Nix, not Linux.
image: /assets/images/posts/this-is-why-i-donot-like-nix-os.png
---

As I remember, it was around 2004 when I first installed Linux using a Red Hat CD bought from a local store. I spent days learning where configurations lived in `/etc`, where binaries sat in `/bin`, how shared libraries linked together via `/usr/lib`, and how text files drove the entire operating system, that beautiful concept of everything is a file. It took some time and effort, but learning those fundamentals paid off. 
<!--more-->
Now, over two decades later, my daily driver is Arch Linux. The init system changed from SysVinit to systemd, Wayland replaced X11, and package managers evolved. But the foundational mental model I built still remains virtually untouched. That knowledge is still directly applicable. That's the beauty of the UNIX legacy, what you learn today stays useful for decades. But NixOS throws that away, and most people who recommend NixOS to beginners don't realize that.

## Learning an abstraction layer, not the OS

The biggest selling point of NixOS is, as they say, that it's declarative and reproducible. Let's see what those two terms actually mean

* Declarative: On standard Linux, you configure a system imperatively. That means you run step-by-step commands over time (`apt install`, edit a file in `/etc`, enable a service). But in NixOS, you don't run steps, you just write down a blueprint of the end result (like `services.nginx.enable = true;`), and the system figures out how to make it happen.
* Reproducible: If you take that blueprint and run it on a new computer five years from now, NixOS uses cryptographic hashes to pull the exact same dependencies, libraries, and configs. You get a bit-for-bit identical setup every single time.

So it's easy to understand why some developers love this pitch. But my opinion is that in chasing that declarative magic, they end up mastering that abstraction layer, rather than the operating system itself. That means NixOS doesn't teach you Linux. Instead, it teaches you something called Nix.

## No FHS and the knowledge is not transferable

The Filesystem Hierarchy Standard (FHS) is a fundamental design of UNIX-like operating systems. We see it throughout the history of UNIX evolution, from early BSD and Red Hat to modern Arch Linux. It's why you always know where to look, header files live in `/usr/include`, binaries in `/bin` or `/usr/bin`, and dynamic linkers in `/lib64`.

NixOS completely ignores this convention. It doesn't use standard folders. Instead, it uses long cryptographic hashes to bury every application inside a location called `/nix/store`.

Most Linux software expects a standard environment. It assumes header files live in `/usr/include` and dynamic linkers sit in predictable paths like `/lib64/ld-linux-x86-64.so.2`. The moment you try to run an unpackaged binary, compile a native C extension, or execute a basic shell script on NixOS, that abstraction collapses.

Of course, you can fix it. But instead of standard Linux tools, you're forced to learn bespoke Nix workarounds like `patchelf`, `buildFHSUserEnv`, or `nix-ld`. And here's my question, do any of those troubleshooting skills transfer anywhere else?

If a beginner starts their Linux journey on NixOS today, they are not learning the universal laws of UNIX. They are learning a highly specific, bespoke abstraction layer. They are learning Nix, not Linux. The moment they log into an Ubuntu server at a new job or try to troubleshoot a standard Debian container, they will be paralyzed. They won't know where files actually live, because Nix hid the real Linux architecture behind a wall of hashes.

---

Got questions, corrections, or suggestions?

Open an issue on [GitHub](https://github.com/dumidusw) or [drop me an email](mailto:dumidu.github@gmail.com).

{% include author-bio.html %}
