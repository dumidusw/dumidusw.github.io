---
layout: post
title: "Style Test Page"
description: "A comprehensive page for testing typography and content styling."
categories: [test]
tags: [style, typography]
---

This page exists solely to test how various Markdown elements appear on the website. It should never be published.

---

## Paragraphs

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec commodo, nisi vitae luctus feugiat, augue lectus gravida nisl, sed volutpat ligula tortor vitae lacus.

This is another paragraph with **bold text**, *italic text*, ***bold italic***, ~~strikethrough~~, and `inline code`.

Here is a sentence containing a [link to the Arch Wiki](https://wiki.archlinux.org/).

---

## Headings

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

---

## Lists

### Unordered

- Linux
- Python
- Bash
- Rust
    - Cargo
    - Crates
    - Ownership

### Ordered

1. Install Arch Linux
2. Configure Hyprland
3. Install development tools
4. Start writing code

---

## Task Lists

- [x] Install Arch
- [x] Configure Git
- [x] Install Neovim
- [ ] Learn Rust
- [ ] Write another article

---

## Blockquotes

> This is a normal blockquote.
>
> It can span multiple paragraphs.

---

> **Tip**
>
> Keep your articles focused on one topic.
{: .callout-tip}

---

> **Warning**
>
> Always read Arch Linux news before performing a full system upgrade.
{: .callout-warning}

---

> **IMPORTANT**
>
> This will permanently delete your data.
{: .callout-important}

---

## Horizontal Rule

---

## Inline Code

Use `pacman -Syu` to update your system.

Use `git status` to inspect your repository.

---

## Code Blocks

### Bash

```bash
sudo pacman -Syu

git clone https://github.com/user/project.git

cd project

makepkg -si
```

### Python

```python
def greet(name):
    print(f"Hello, {name}!")

greet("World")
```

### Zsh

```zsh
autoload -Uz compinit
compinit

alias ll="ls -lah"
```

### Rust

```rust
fn main() {
    println!("Hello, world!");
}
```

### JSON

```json
{
    "name": "passfzf",
    "language": "zsh",
    "version": "1.0.0"
}
```

### YAML

```yaml
title: My Article
author: Dumidu
tags:
  - linux
  - python
```

### Diff

```diff
- old line
+ new line
```

### Plain Text

```text
:: Synchronizing package databases...
 core downloading...
 extra downloading...
 community downloading...
```

---

## Keyboard Shortcuts

Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to terminate a program.

Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to open the command palette.

---

## Tables

| Tool | Language | Platform |
|------|----------|----------|
| passfzf | Zsh | Linux |
| sysreport | Bash | Linux |
| Jekyll | Ruby | Cross Platform |

---

## Definition List

Term

: Definition goes here.

Another Term

: Another definition.

(Only works if your Markdown processor supports it.)

---

## Nested Lists

- Linux
    - Arch
    - Debian
    - Fedora
        - KDE
        - GNOME
        - Hyprland

---

## Long Paragraph

One of the most important aspects of a technical blog is readability. Long-form articles should feel effortless to read, with comfortable line spacing, appropriate paragraph separation, and typography that guides the eye naturally from one section to the next. This paragraph intentionally contains enough text to test how your body font behaves over multiple lines. As you tweak your CSS, pay attention to line height, margins, maximum content width, and how links, inline code, and emphasized text integrate into the flow of reading.

---

## Images

![Sample image](https://placehold.co/800x400)

Image caption should look nice if you decide to style them later.

---

## Mixed Content Example

Suppose we want to install Informant.

### Step 1

Update package databases.

```bash
sudo pacman -Sy
```

> **Important**
>
> Updating package databases alone is generally discouraged. This is only an example.

### Step 2

Install the package.

```bash
sudo pacman -S informant
```

Verify installation.

```bash
informant --version
```

Expected output:

```text
informant 0.x.x
```

---

## Footnotes

Footnotes are useful for additional information.[^1]

[^1]: This is an example footnote.

---

## Emoji

🐧 Linux

🐍 Python

🦀 Rust

⚡ Performance

💡 Tip

⚠ Warning

🚀 Release

---

## End

Congratulations!

If this page looks good, your blog is ready for almost any technical article you'll write.
