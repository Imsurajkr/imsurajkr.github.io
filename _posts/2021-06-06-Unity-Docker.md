---
title: GaaS
layout: post
post-image: "https://opengraph.githubassets.com/2e94ce8e626ce1bbff705df44719eb54ad0ae43ec2747cf9b3e7a86d8a0cf3d6/capistrano/capistrano"
description: Gaming as a Service ... 
tags:
- rails
- ruby
- Capistrano 
---

Can we create something to not just only play but to create the os also Installing Unity is hard . It requires multiple things to be configured Android SDK , Java SDK and many more 

Can we do something from our base os to launch unity graphics with docker ?

```bash 
#On Local Machine
xhost +local:docker
docker run -it --rm -e DISPLAY=$DISPLAY -v /tmp/.X11-unix/:/tmp/.X11-unix/ unityci/editor:ubuntu-2021.1.9f1-android-0.13.0 bash
/opt/unity/Editor/Unity 

# It's Done Enjoy the day with unity 

```