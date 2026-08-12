---
title: "A Branching and Tagging Workflow for Git"
description: "How to name branches, mark releases with lightweight and annotated tags, and move a feature from develop through staging to production without losing your way."
pubDate: 2020-09-25
heroImage: "https://cdn.pixabay.com/photo/2020/06/12/14/07/code-5290465_960_720.jpg"
tags:
  - "git"
  - "github"
---

These are the branching methods most commonly followed in the industry. If you know of others, please share them.

## Branch designations

1. **develop** — always stable and ready to be deployed.
2. **feature/BACKEND-xxx** (or `release/BACKEND-xxx`) — replace `xxx` with the ticket number.
3. **master** — the archive of the stable source at a particular date, marked with tags.

## Tags

Tags mark release points such as v1.0 or v2.0.

### Listing your tags

```bash
git tag -l                # -l lists the tags
git tag -l "v1.8.5*"      # every tag starting with v1.8.5
```

### Creating tags

Git supports two kinds of tag:

- **Lightweight** — a branch that never changes. It is just a pointer to a specific commit.
- **Annotated** — checksummed, and carries the tagger's name, email, date and a message. Annotated tags are generally recommended, precisely because they keep all of that information.

Creating an annotated tag:

```bash
# -a makes the tag annotated
git tag -a v1.4 -m "my version 1.4"
git tag
git show v1.4 # shows the tag data along with the commit
```

Creating a lightweight tag:

```bash
git tag v1.4-lw
git tag
git show v1.4-lw
```

### Tagging later

You can tag commits after you have moved past them:

```bash
git log --pretty=oneline
git tag -a v1.2 <your commit checksum>
git tag
git show v1.2
```

### Sharing tags

By default `git push` does not transfer tags to remote servers — you have to push them explicitly, the same way you share remote branches:

```bash
git push origin v1.5

# If you have a lot of tags to push
git push origin --tags

# or
git push <remote> --tags
```

### Deleting tags

```bash
# Delete the tag in your local repository
git tag -d <tagname>
git tag -d v1.4-lw

# That does not remove it from any remote, so delete it there too
git push <remote> :refs/tags/<tagname>
git push origin :refs/tags/v1.4-lw

# The alternative way
git push origin --delete <tagname>
```

## The branching and release algorithm

1. Create a feature branch from `develop`:

   ```bash
   git checkout develop
   git fetch
   git pull
   git checkout -b feature/PROJECT-XXX # replace XXX with the ticket number
   ```

2. Implement the necessary changes.
3. Test locally and on the dev environment.
4. When ready, open a PR against `develop`.
5. Fix the review comments.
6. Deploy to staging when ready — **from the same PR branch**.
7. Deploy to production if testing succeeded.
8. If defects are found during staging tests, repeat from step 2.
9. If a new feature causes an intolerable defect in production, roll back to the previous release.
10. Merge the pull request.

## Understanding the GitHub flow

Branching is a core concept in Git, and the entire GitHub flow is built on it. There is only one rule: anything in the main branch is always deployable.

Because of that, it is important that a new branch is created off `main` when you work on a feature or a fix. Give it a descriptive name — `refactor-authentication`, `user-content-cache-key`, `make-retina-avatars` — so others can see what is being worked on.

Commit messages matter, especially since Git tracks your changes and then displays them as commits once they are pushed. Clear messages make it easier for other people to follow along and give feedback.

Pull requests are useful both for contributing to open source and for managing changes to shared repositories. In a fork-and-pull model they notify maintainers about changes you would like them to consider. In a shared-repository model they start code review and discussion before anything is merged into the main branch.

Pull request comments are written in Markdown, so you can embed images and emoji, use preformatted text blocks and other lightweight formatting.

Once your pull request has been reviewed and the branch passes your tests, you can deploy the changes to verify them in production. If the branch causes problems, roll it back by deploying the existing main branch.

## A better git log

A plain `git log` is not much use. Remember **A DOG**:

```bash
git log --all --decorate --oneline --graph
```
