---
title: Github Branching 
layout: post
post-image: "https://cdn.pixabay.com/photo/2020/06/12/14/07/code-5290465_960_720.jpg"
description: A sample demo on github banching techniques 
tags:
- github
- branching
- practices
---
# Branching Technique

Best branching methods followed by the industry. Please share if you know more.

## Sample demo of git brnching techniques

## Branches Designation 

1. **Develop** :- Always stable and ready to be deployed.
2. **Feature/BACKEND-xxx** (or release/BACKEND-xxx) :- Here the xxx can be replaced with the ticket number.
3. **Master** :- Serves as the archive of the stable system source code state at particular date, marked with Tags.

# Let's learn tagging first.

## Git Tags
We use this functionality to mark release points (v1.0, v2.0).
### Listing your tags
Listing the existing tags is simple <br />.

```bash 
git tag  -l # -l is used for list the tags
git tag -l "v1.8.5*" # here it will all the tag list containing v1.8.5
```
### Creating Tags 

Two types of tags are basically suppported in github.
1. Lightweight 
2. Annotated

**Lightweight** :- A branch that doesn’t change — it’s just a pointer to a specific commit.<br />
**Annotated** :- . They’re checksummed. contain the tagger name, email, and date; have a tagging message. It’s generally recommended that you create annotated tags so you can have all this information.<br />

## Annotated tag 
```bash
#  TO create a git annoted tag.-a when you run the tag command.
git tag -a v1.4 -m "my version 1.4"
git tag
git show v1.4 # You can see the tag data along with commit.
```
## Lightweight Tags 

```bash 
git tag v1.4-lw
git tag
git show v1.4-lw
```
## Tagging latter 

tag commits after you’ve moved past them
```bash 
git log --pretty=oneline 
git tag -a v1.2 <Your commit checksum>
git tag 
git show v1.2
```

## Sharing Tags 

By default, the git push command doesn’t transfer tags to remote servers. You will have to explicitly push tags to a shared server after you have created them. This process is just like sharing remote branches — you can run git push origin <tagname>
```bash 
git push origin v1.5
# if you have lots of tags and want to commit 
git push origin --tags
# or 
git push <remote> --tags
```
## Deleting tags 

To delete a tag on your local repository,
```bash 
git tag -d <tagname>
git tag -d v1.4-lw
# This does not remove tag from any remote server 
git push <remote> :refs/tags/<tagname>
git push origin :refs/tags/v1.4-lw

# The alternative way to delete a tag is 
git push origin --delete <tagname>
```
## -------------------------------------------------------------------

# Branching and Release algorithm 

1. Create a feature branch from develop branch
```bash 
git checkout develop 
git fetch 
git pull 
git checkout -b feature/PROJECT-XXX # here xxx can be canged with ticket number
```
2. Implement necessary changes.<br />
3. Test on local and dev environment. <br />
4. when ready , create PR to develop.
```bash 
git request pull  ...
```
5. Fix Comments 
6. Deploy to the staging when ready (**From the same PR branch**).<br/>
7. Deploy to the production if testing succeeded.<br />
8. In case of defects found during testing on staging repeat the algo from point 2.<br />
9. In case of In-tolerable defect in production caused by new feature rollback to previous release.<br />
10. Merge Pull Request.<br />

Multiple branches and setup is created to practice branching techniques.

## Understanding the Github Workflow
Branching is a core concept in Git, and the entire GitHub flow is based upon it. There's only one rule: anything in the main branch is always deployable.<br />

Because of this, it's extremely important that your new branch is created off of main when working on a feature or a fix. Your branch name should be descriptive (e.g., refactor-authentication, user-content-cache-key, make-retina-avatars), so that others can see what is being worked on.<br />

Commit messages are important, especially since Git tracks your changes and then displays them as commits once they're pushed to the server. By writing clear commit messages, you can make it easier for other people to follow along and provide feedback.
<br />

Pull Requests are useful for contributing to open source projects and for managing changes to shared repositories. If you're using a Fork & Pull Model, Pull Requests provide a way to notify project maintainers about the changes you'd like them to consider. If you're using a Shared Repository Model, Pull Requests help start code review and conversation about proposed changes before they're merged into the main branch. <br />

Pull Request comments are written in Markdown, so you can embed images and emoji, use pre-formatted text blocks, and other lightweight formatting. <br />

Once your pull request has been reviewed and the branch passes your tests, you can deploy your changes to verify them in production. If your branch causes issues, you can roll it back by deploying the existing main branch into production.<br />


## Contributers are always welcomed :-)

Just a simple log is not cool<br /> 
Just remember A Dog <br />
**git log --all --decorate --oneline --graph** <br /> 
<!-- ![alt text](images/dog.png) -->


# Thanks for reading :-)

