---
layout: post
title:  "Why I built psmon"
date:   2026-08-16 00:00:00 +0530
categories: [projects]
description: Why I built psmon, a lightweight interactive process monitor that brings the simplicity of ps together with the interactivity of modern process monitors, using nothing but Zsh and standard Linux utilities. 
image: /assets/images/posts/psmon.webp
---

Anyone who uses a Unix like operating system has probably come across tools like `top`, `htop`, or the graphically rich `btop`. They are indeed feature rich and powerful. They are capable of providing pretty much every system metric an experienced system administrator could ever ask for. But I wanted something simple, fast, and approachable.

<!--more-->

For new Linux users, or even experienced developers who just want to quickly figure out why their computer fan has gone into helicopter mode, these tools can feel overwhelming. They show a lot of numbers, graphs, and processes when all you really want is a straight answer. They are verbose. 

Now if we look at the other end of the spectrum, we have the native `ps` command, which was developed in the early 1970s. It's a fantastic tool for process analysis. It's lightweight and very fast. But we don't get an eye-catching dashboard with it. Another limitation of `ps` is that it gives you a static snapshot. For example, let's say you want to find a memory hog, watch it live, and terminate it. You might start with `ps`, pipe the output through `grep` or `awk`, and repeat the command to see what's happening. Then, when you find the process you want, you still have to copy its PID and pass it to `kill`.

I wanted something in the middle.

I didn't want to build just another alias or another basic wrapper around the `ps` command. Instead, I wanted a tool that respected the speed and historic efficiency of `ps`, but elevated it into an interactive experience. I wanted live watching, instant sorting, and safe, tree-aware process killing, all presented in a clean, readable UI that doesn't overwhelm the user.

That is why I built psmon.

---

## The Architecture

From the start, I wanted this utility to be simple and easy to deploy. So I decided early on that there would be no compilation step and no heavy dependencies.

Now, when it comes to building a modern CLI tool, developers usually prefer to use a language like Rust, Go, or even Python. They are great, but I wanted this to lean entirely on the shell, specifically Zsh. So if you have a terminal and a standard Linux environment, `psmon` just works. There is nothing to compile and nothing to `pip install`.

I also wanted this to be fast and efficient without relying on an external library like `ncurses`. A shell-based TUI doesn't need anything beyond the terminal itself. That gave me a simple architecture. Then I split the work into two parts:

**The heavy lifters (`ps`, `awk`, `lsof`).** 

If you want, you can write a shell program to read process data and sort it yourself, but that would be very time-consuming and you'd be reinventing the wheel. So `psmon` hands that work off to well-established utilities such as `ps`, `awk`, and `lsof`. This is the Unix philosophy, isn't it?

**The presentation layer (Zsh).** 

Zsh is the conductor. It takes that raw, static output and brings it to life. It runs the interactive watch loop, intercepts keypresses on the fly, and paints the terminal with ANSI color codes based on CPU and memory thresholds.

Here I'm showing a simplified version of that split, taken directly from `psmon`'s process list rendering:

```zsh
# The heavy lifter: ps does the querying AND the sorting.
# No custom sort logic lives in this script - we just tell it which
# field to sort by and take what comes back.
while read -r pid ppid user cpu mem etime comm; do

    # The presentation layer: Zsh decides what the numbers mean.
    if (( cpu > 10 )); then
        echo "${RED}${pid}  ${cpu}%  ${comm}${NC}"
    elif (( cpu > 5 )); then
        echo "${YELLOW}${pid}  ${cpu}%  ${comm}${NC}"
    else
        echo "${pid}  ${cpu}%  ${comm}"
    fi

done < <(ps -eo pid,ppid,user,%cpu,%mem,etime,comm --sort=-%cpu --no-headers)
```

Here it's worth pointing out two important things. First, the `--sort=-%cpu` flag is essentially the entire sorting logic in `psmon`. The second is the `< <(...)` at the bottom. It's a process substitution. It feeds `ps`'s output into the `while read` loop while allowing the loop itself to run in the current shell. So any state the loop needs to update stays visible to the rest of the script.

This is a small detail, but it's the kind of thing that matters when you're trying to keep a shell script fast and predictable. It avoids putting the loop behind a normal pipeline, where the loop could run in a subshell.

This approach keeps the script lightweight, fast, and easy to audit. You can read it from top to bottom and know exactly what's running and why.

It's the Unix philosophy in action. I let each tool do one thing, while the shell wires them together.

------------
## Two Problems I Had to Deal With

Writing a process monitor in shell sounds easy. But once you start dealing with a modern Linux desktop, things get more complicated. Sandboxed applications, sprawling process trees, and terminal behavior all introduced their own challenges. I had to deal with two particularly interesting problems.

### 1. Sandbox-Aware Killing

Modern applications are messy. Browsers and complex desktop apps often spawn a tree of processes rather than running as a single monolithic process. This multi process design uses renderers, zygotes, and helper services to isolate tasks, improve security, and manage resources. When you run them via Flatpak, the process tree gets even more layered because Flatpak enforces sandboxing with Bubblewrap (`bwrap`).

When an application runs inside a sandbox, its processes don't always look like normal children of the main application process. Because the sandbox creates its own container, some of the application's processes may appear under the Bubblewrap process instead of the original program when viewed from the host. So if you use a plain `kill` command, you can miss related processes. If you use `killall`, it can grab more processes than you intended to target.

To solve this, I had to carefully design `psmon`'s interactive kill mode (`-k`) to actually understand modern application architectures.

When you target a process by name, `psmon` doesn't just take the first match. It checks each process's command-line arguments to identify auxiliary browser processes, such as Chromium's `--type=renderer`. These processes are filtered out of the target list because they will terminate when the main application dies. This keeps the list clean and lets you select the actual application instance.

Then, once you've picked a target, `psmon` walks up the process tree. If it hits a `bwrap` or `flatpak-bwrap` process, it doesn't stop there. It treats the wrapper as a pass-through and keeps climbing, looking for the real top-level ancestor above the sandbox layer. That topmost process is what gets treated as the actual root. Once the true root is identified, `psmon` asks for confirmation. If you confirm, then it terminates the entire tree at once.

### 2. Flicker-Free Live Updates

The obvious way to build a live dashboard in shell is to call `clear` at the top of the `while` loop. But if you do that on every refresh, the whole screen gets cleared and redrawn again and again. The result is noticeable flicker.

To make `psmon`'s live watch mode (`-w`) update cleanly, I removed `clear` from the periodic refresh. While `clear` is still called once when you first enter watch mode to give you a clean slate, and again if you switch the sort order, it is completely absent from the continuous refresh loop. Instead, each refresh tick uses two small ANSI escape sequences to control the terminal.

On every refresh, `psmon` moves the cursor back to the top-left corner (`\033[H`) and redraws the process list. Each line ends with `\033[K`, which tells the terminal to erase everything from the cursor to the end of that line:

```zsh
# Instead of clearing the whole screen, jump the cursor home and let
# each line erase its own trailing remainder as it's printed.
printf "\033[H"
while read -r line; do
    echo "$line\033[K"
done < <(ps -eo pid,ppid,user,%cpu,%mem,etime,comm --sort=-%cpu --no-headers)
```

This means each row overwrites the previous one in place. If the new row is shorter than the old one, `\033[K` removes the remaining characters. No leftover text is left on the screen.

When you press `c`, `m`, or `t` to switch the sort order, `psmon` does a quick clear to safely reset the canvas, remembers your new choice, and immediately resumes this ANSI-powered loop.

The result is a clean update on every tick, without the constant visual flicker or unnecessary screen tearing you usually get from shell dashboards.

-------------
## Zsh glues programs together

Building `psmon` reminded me why the Unix philosophy has survived for so long. You don't always need a heavy compiled binary or a massive dependency tree to build a fast, modern CLI tool. Sometimes, taking reliable tools like `ps` and `awk` and connecting them with just enough Zsh is all you need to solve a real problem.

It took extra effort to polish the rough edges, such as regex validation, clear error messages, and cryptographically signed Git tags. But the payoff is a tool that feels native and finished.

If you are tired of piping raw `ps` output through `grep`, but don't want a complex dashboard every time your fan spins up, give `psmon` a try.

You can find the source code, full documentation, and installation instructions on my GitHub account:

[**https://github.com/dumidusw/psmon**](https://github.com/dumidusw/psmon)

It includes a simple `./install.sh` script, or you can load it through your favorite Zsh plugin manager.

I'd love to hear what you think. If you find a bug or get an idea for a feature that keeps that balance between utility and simplicity, please feel free to open an issue or send a pull request. I'd genuinely appreciate it.

---

Got questions, corrections, or suggestions?

Open an issue on [GitHub](https://github.com/dumidusw) or [drop me an email](mailto:dumidu.github@gmail.com).

{% include author-bio.html %}
