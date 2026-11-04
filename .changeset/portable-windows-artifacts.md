---
"@y4shin/pi-task-workflow": patch
---

Read artifacts the way Windows writes them, and keep created directory names legal there. Files saved as UTF-8 with a byte-order mark or as UTF-16LE (Notepad, Windows PowerShell 5.1) now decode correctly instead of becoming replacement characters during the schema-5 migration, and CRLF frontmatter no longer leaks a carriage return into its last value. `notify_user` resolves its config from the OS home directory instead of `process.env.HOME`, which native Windows leaves unset. Slugs are capped at 64 characters and refuse the device names Windows reserves. A new `.gitattributes` pins `eol=lf`, so a Windows checkout cannot drift into CRLF artifacts.
