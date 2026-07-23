---
layout: post
title:  "Why I Use mise to Manage Python, Node, and Rust"
date:   2026-07-23 05:20:00 +0530
categories: [linux,archlinux]
tags: [arch-linux, mise, python, node, rust, version-management, developer-tools]
description: Learn why I use mise to manage Python, Node, and Rust on Arch Linux. Understand how it keeps project toolchains separate from the operating system while supporting multiple language versions.
image: /assets/images/posts/mise-python-node-rust.png
series: Arch Linux
order: 6
---

When you install Python, Node, or Rust with pacman, you get whatever version Arch currently ships. That's exactly what your operating system expects, but it isn't always what your projects expect. One project might require Python 3.11 while another uses Python 3.14, and the official repositories generally don't let you choose between multiple language versions. They're designed to provide a single current version of each package.

<!--more-->

Managing those different language versions without interfering with the operating system is exactly the problem `mise` solves.

There are plenty of version managers available, including `pyenv`, `nvm`, `rustup`, `asdf`, and others. I chose `mise` because it gives me a single tool with a consistent interface for all of my development toolchains. Instead of learning and maintaining a different workflow for each language, I can manage them all in one place while still keeping them separate from the operating system.

Let's look at how it works and the gotchas I hit while setting it up.

## 1. The problem

Arch Linux is built around one core idea: everything moves together. Your kernel, drivers, desktop environment, and supporting libraries are all expected to stay in sync. That's why a system update upgrades everything together.

You can update an individual package if you want, but doing that without updating the rest of the system can leave your software out of sync. This is known as a partial upgrade. It can lead to unexpected problems because different parts of your system are no longer compatible.

Programming language toolchains include interpreters, compilers, and related development tools. Unlike most system packages, they often need multiple versions installed at the same time.

Imagine you're maintaining a project that requires Python 3.11 because one of its dependencies hasn't been updated to support Python 3.14 yet. Arch's official repositories don't maintain multiple versions of Python. You get whichever version they're currently shipping. So there's no official way to install an older version just for that project.

And even if there were, updating a project's Python shouldn't mean performing a full system update that also upgrades unrelated system packages.

That's the gap `mise` fills. It lets your projects use the language versions they need while leaving the operating system's versions exactly where they belong.

## 2. The ownership idea

The solution is to keep two separate layers, each managed by a different tool.

```text
                Operating System
           -------------------------
              Managed by pacman
           /usr/bin/python
           /usr/bin/node
           /usr/bin/rustc


                  Projects
           -------------------------
               Managed by mise
           Python 3.11
           Python 3.14
           Node 20
           Node 22
           Rust stable
           Rust nightly
```

The system copy of Python, Node, and Rust stays managed by pacman. It's used by the operating system and anything that expects those tools to exist in their standard locations.

The project copy is managed by you. It's switchable per project, versioned independently of the operating system, and managed by `mise`.

This is the same idea I try to apply throughout my Arch setup. I let each tool manage what it was designed to manage.

## 3. What mise does

A common misconception is that `mise` replaces your system Python, Node, or Rust. It doesn't.

Instead, it installs each toolchain into its own directory and adds itself to the front of the list your shell searches when you type a command. That list is called `PATH`.

So when you type:

```bash
python
```

your shell finds `mise`'s Python before it finds `/usr/bin/python`.

That's really all there is to it.

When you type `python`, your shell searches each directory listed in `PATH` from left to right and runs the first match it finds. After `mise activate` runs, the `mise` version comes first. The system copy hasn't moved and hasn't changed. It's simply no longer first in your interactive shell.

This distinction matters because many parts of Linux don't use your interactive shell at all. Pacman hooks, AUR build scripts, systemd services, and scripts that begin with:

```bash
#!/usr/bin/python
```

use an absolute path instead of searching `PATH`.

Those continue using the pacman-managed Python exactly as before.

## 4. Installing mise

```bash
# 1. Install mise from the official repositories.
sudo pacman -S mise

# 2. Install build dependencies some toolchains may require.
sudo pacman -S base-devel openssl zlib readline sqlite

# 3. Activate mise in your shell.
echo 'eval "$(mise activate zsh)"' >> ~/.zshrc
source ~/.zshrc

# If your shell uses a different location for .zshrc
# (for example, because you use ZDOTDIR),
# add the activation line there instead.

# 4. Install the toolchains you use.
mise use -g python@latest
mise use -g node@latest
mise use -g rust@latest
```

One small gotcha: if you have zsh's `setopt correct` enabled, typing `mise` can trigger this prompt:

```text
zsh: correct 'mise' to 'nice' [nyae]?
```

If you answer that prompt without paying attention, the next prompt, often the real `sudo` password request, can become confusing. A command that looked like it ran may not have actually executed.

If you use `setopt correct`, pay close attention to which prompt you're answering.

## 5. Migration notes

These notes are only relevant if you're migrating from an existing setup. Feel free to skip this section if you're starting from scratch.

### Coming from nvm, pyenv, or something similar?

Remove the old version manager before activating `mise` for that language.

Running two version managers at the same time rarely produces a clear error. Instead, whichever one modifies `PATH` last usually wins.

I had `zsh-nvm` installed through `zinit`. Before using `mise` for Node, I removed the plugin, its environment variables, and the deferred initialization block.

### Rust works a little differently

After installing everything, I checked where each executable actually lived.

```bash
$ which python node cargo rustc

/home/dumidu/.local/share/mise/installs/python/latest/bin/python
/home/dumidu/.local/share/mise/installs/node/latest/bin/node
/home/dumidu/.cargo/bin/cargo
/home/dumidu/.cargo/bin/rustc
```

Python and Node are installed directly by `mise`.

Rust is different.

Instead of downloading Rust itself, `mise` delegates that work to `rustup`. If `rustup` is already installed, `mise` simply reuses it.

You still get per-project Rust versions through `mise.toml`, but the actual toolchain lives under `~/.cargo/bin`.

### Make sure you're editing the right .zshrc

At one point, `mise activate` simply refused to work.

The problem wasn't `mise` at all.

My shell was using:

```bash
export ZDOTDIR="$HOME/.config/zsh"
```

which meant zsh was reading:

```
~/.config/zsh/.zshrc
```

instead of:

```
~/.zshrc
```

I had been editing the wrong file.

If your changes don't seem to take effect, verify which configuration file your shell is actually using.

```bash
echo $ZDOTDIR
readlink -f ~/.zshrc
```

These two commands can save a lot of confusion.

## 6. Verify it worked

`mise ls` shows what `mise` thinks it's managing.

```bash
$ mise ls

Tool    Version           Source                      Requested
node    26.5.0            ~/.config/mise/config.toml  latest
python  3.14.6            ~/.config/mise/config.toml  latest
rust    1.97.1 (symlink)  ~/.config/mise/config.toml  latest
```

A more convincing check is `which -a`.

Unlike `which`, it lists every matching executable in `PATH`.

```bash
$ which -a python

/home/dumidu/.local/share/mise/installs/python/latest/bin/python
/usr/bin/python

$ which -a node

/home/dumidu/.local/share/mise/installs/node/latest/bin/node
/usr/bin/node
```

This confirms that both layers still exist.

The `mise` version appears first because it comes first in `PATH`.

The pacman-managed version is still there, exactly where the operating system expects it. That's the copy used by pacman hooks, AUR builds, system services, and anything that references an absolute path.

The two layers aren't competing. They have different responsibilities.

The system copy serves the operating system.

The `mise` copy serves your projects.

Once you've made that separation, operating system updates and development toolchain updates become completely independent. That's the boundary I wanted, and it's the reason I use `mise`.

---

Got questions, corrections, or suggestions?

Open an issue on
[GitHub](https://github.com/dumidusw)
or email me at
dumidu.github@gmail.com.

There's no comment section on this blog, but I'm always happy to hear
from readers.
