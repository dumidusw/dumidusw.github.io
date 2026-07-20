---
layout: post
title: "My Two Layer Safety Net for Arch Linux"
description: A simple two-layer recovery strategy using the Linux LTS kernel and Timeshift to recover from most Arch Linux update problems with confidence.
date: 2026-07-19
categories: [linux, arch]
tags: [arch-linux, grub, kernel, timeshift, backups]
series: Arch Linux
order: 7
---

Arch Linux is a rolling release distribution, so it doesn't have version numbers like Ubuntu 26.04, Linux Mint 22.3, or Fedora 44. Instead, new versions of packages are released continuously. Whenever you update your system, you receive the latest available software.

That's one of Arch's biggest strengths. New features, hardware support, and bug fixes arrive quickly. You don't want to wait for the next major release, but there is a trade-off. 
<!--more-->
Since Arch stays much closer to upstream software, changes reach you sooner. Most updates work perfectly, but every now and then an update can introduce a regression or create an unexpected compatibility issue in your system. It may be a little screen glitch to a complete boot failure. New Arch users hear such stories and naturally become nervous about running updates.

Rather than worrying about whether an update might break something, I prefer to think about what I'll do if it does. Having a clear recovery plan removes most of the uncertainty. Instead of guessing, I simply work through the same two recovery steps every time.

My safety net has two layers. I first try an LTS kernel to determine whether the problem is limited to the latest kernel. If that doesn't help, I restore a Timeshift snapshot to return my system to a known-good state. Each layer serves a different purpose, and together they cover most of the problems I'm likely to encounter after an update.

## Safety net one: a second, older kernel

The "kernel" is the core part of Linux that talks to your hardware, your graphics, your keyboard, your wifi, everything. Arch updates the kernel often, and once in a while a brand new kernel version has a bug that breaks something on your specific computer.

The fix is simple: install a second kernel. Arch offers a package called `linux-lts` (LTS stands for "Long Term Support"). Unlike your regular kernel, this one barely changes, it gets small safety fixes but skips all the fast-moving updates. Because it changes so little, it's very unlikely to have the same bug that just broke your regular kernel.

Once installed, it shows up as an extra option in your boot menu (GRUB), usually under something like "Advanced options for Arch Linux."

So here's what I do if something looks wrong after an update — screen won't turn on, system freezes, whatever:

1. Restart the computer.
2. In the boot menu, pick the LTS kernel instead of the normal one.
3. See what happens.

If the LTS kernel boots up fine, I've learned something important: the problem is most likely related to the latest kernel. I can keep using LTS for a few days while waiting for a fix, or investigate the issue further.

If the LTS kernel has the same problem, then I know it's not the kernel's fault at all, something else broke. Time for safety net number two.

This step is quick and safe. You're not deleting anything or changing any settings. You're just trying a different, more stable kernel for one boot. That's why it's always my first move.

**One small tip:** when you install a second kernel, double check which one your computer boots into automatically. 

> **Tip**
>
> After installing `linux-lts`, make sure your regular `linux` kernel is still your default boot entry. I prefer to keep the LTS kernel as an emergency fallback rather than my everyday kernel.
{: .callout-warning}

## Safety net two: Timeshift, a full system backup tool

The LTS kernel only helps if the _kernel_ is the problem. But sometimes an update breaks something else — a setting, a program, a config file. In those cases, switching kernels won't fix anything.

That's where [Timeshift](https://github.com/linuxmint/timeshift) comes in. It's a free tool that lets you create and restore snapshots of your system. I configure it to create regular snapshots, so I always have a recent restore point if an update goes wrong. I can roll my entire system back to how it was right before the problem started — settings, programs, everything.

I keep Timeshift snapshots saved on a separate hard drive, just in case something happens to my main drive too.

So if I try the LTS kernel and the problem is _still_ there, that tells me it's not kernel-related — and that's my cue to restore the last Timeshift snapshot instead of trying to fix things by hand.

## Putting the two together

Neither of these tools is new or special on its own — plenty of people use one or the other. What makes this combination useful is doing them **in order**:

1. Something breaks after an update.
2. **Try the LTS kernel first.** It's fast and doesn't change anything permanently.
    - Works fine? The regular kernel was the problem. Stick with LTS for now.
    - Still broken? It's not the kernel.
3. **Restore the latest Timeshift snapshot.** This returns the system to the state it was in before the problematic update.

Each step tells you something the last one didn't, so you're never just guessing. You try the easy, safe option first, and only reach for the bigger fix if you actually need it.

## What this won't fix

To be fair, this combo isn't magic. If your **boot menu itself** breaks, let's say GRUB gets misconfigured, neither of these will help, because you can't even get to the point of picking a kernel or restoring a backup. In that rare case, you'd need to boot from a USB drive and fix things manually. It's worth knowing that step exists too, even if you hopefully never need it.

I don't expect to use these recovery tools very often. In fact, most Arch updates complete without any issues at all. The point isn't that Arch is unreliable, it's that having a recovery plan removes the uncertainty when something unexpected does happen.

Keeping an LTS kernel installed gives me a quick, non-destructive way to check whether the latest kernel is responsible. If it isn't, Timeshift lets me return my system to a known-good state in just a few minutes.

For me, that simple two-step process has made updating Arch much less stressful.

<!--
Introduction

Write one or two paragraphs introducing the problem this article
solves.

This text becomes the homepage excerpt, so it should stand on its own
and encourage readers to continue.

Imagine someone only reads these two paragraphs.
Would they understand what this article is about?
-->

<!--
Publishing checklist

Content
---------
[ ] Clear title
[ ] Introduction explains the problem
[ ] Sections flow logically
[ ] Commands tested
[ ] Output verified
[ ] Grammar and spelling checked

Links
------
[ ] Internal links added where appropriate
[ ] Related posts reviewed
[ ] External links still valid

Metadata
---------
[ ] Description written
[ ] Categories correct
[ ] Series/order set (if applicable)
[ ] Custom image added (if needed)

Final review
------------
[ ] Read the article from top to bottom once
[ ] Check desktop layout
[ ] Check mobile layout
[ ] Verify code blocks render correctly
-->
------------------------
Got questions, corrections, or suggestions?

Open an issue on
[GitHub](https://github.com/dumidusw)
or email me at
dumidu.github@gmail.com.
