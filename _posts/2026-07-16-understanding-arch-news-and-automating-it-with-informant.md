---
layout: post
title:  "Understanding Arch News (and Automating It with Informant)"
date:   2026-07-16 09:00:00 +0530
categories: linux archlinux projects
description: Arch Linux announces breaking changes through its news page, not version numbers. Here's why that matters, and how Informant automates checking it.
image: /assets/images/posts/understanding-arch-news-informant.png
series: Arch Linux
order: 2
---

Arch's rolling-release model means breaking changes are announced on
the news page, not hidden behind a version number. There's no
"upgrading from 22.04 to 24.04" moment that forces you to read release
notes. Packages just update, continuously, and pacman has no idea
whether any given update needs your attention first. 
I've seen people say, "An update broke my system, so I'm leaving Arch."
Sometimes the update itself isn't the real problem. 
It was a manual intervention announced in the Arch News that went unnoticed.

<!--more-->

## Why this is easy to skip

`pacman -Syu` doesn't check the news for you. 
It has no concept of "this update requires manual intervention". 
That information only exists on the Arch News page. pacman doesn't know about it, 
so nothing stops you from updating without reading it first.
Most of the time that's fine. Occasionally it isn't. A filesystem
migration, a bootloader change, a package split that needs a manual
step before or after upgrading. The news page is the only place these
get announced, and reading it before every update is a discipline,
not a safeguard pacman enforces for you.

It's easy to forget. You're in a hurry, or you've updated your system 
dozens of times without any issues. Eventually you skip checking the 
news and that might be the one time it mattered.

## What Informant does

Informant closes that gap by turning "read the news" from something 
you have to remember into something pacman enforces automatically.

It's a pacman hook, specifically a `PreTransaction` hook. 
That means it runs before an upgrade or installation begins, not after.

Install it from the AUR:

```bash
yay -S informant
```

Once installed, its hook checks for unread Arch Linux news items
every time you run an upgrade or install. The transaction is aborted 
before a single package changes that you can't
accidentally proceed without reading the news first. 
Informant only checks installs and upgrades. Package removals aren't blocked 
because Arch News announcements are generally about changes you'll encounter 
when installing or upgrading packages.

Informant gives you three subcommands:

- **`informant check`** — checks for unread items. This is what the
  hook actually calls; its exit code equals the number of unread
  items, which is how the hook knows whether to abort the transaction.
- **`informant list`** — lists news item titles (add `--unread` to
  filter to only what you haven't read yet).
- **`informant read`** — prints an item and marks it read. Run it with
  no argument and it loops through everything unread, one at a time.

## The actual workflow

Once Informant is installed, your normal update process doesn't change.

```bash
sudo pacman -Syu
```

If there are unread Arch News items, Informant stops the transaction
before any packages are upgraded.

Read the news with:

```bash
informant read
```

When you've finished reading, simply run the update again:

```bash
sudo pacman -Syu
```

If there's no unread news, the update proceeds as usual.

> **NOTE**
>
> When you install Informant for the first time, it treats every
> existing Arch News item as unread because it doesn't know what you've
> already read.
>
> Run:
>
> ```bash
> informant read
> ```
>
> once after installing it. After that, Informant will only stop you
> when new Arch News is published.
{: .callout-note}


<!--more-->

## Where arch-sysreport fits in

Reading a news item doesn't always tell you whether it actually
applies to *your* system. Some announcements are conditional. For example, 
"if you're using this bootloader," "if this package is installed," 
"if you're on this filesystem." Answering that usually means running two
or three separate commands to check.

That's exactly why I created [`arch-sysreport`](https://github.com/dumidusw/arch-sysreport). 
It collects the system details you typically need when deciding whether a news item applies to your system.
Instead of running several separate commands, you get everything in one place.

Informant makes sure you never miss the news. [`arch-sysreport`](https://github.com/dumidusw/arch-sysreport) makes it
faster to figure out what to do about it.

---

Got questions, corrections, or suggestions?

Open an issue on
[GitHub](https://github.com/dumidusw)
or email me at
dumidu.github@gmail.com.

There's no comment section on this blog, but I'm always happy to hear
from readers.
