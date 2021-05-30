---
title: Docker UI 
layout: post
post-image: "https://miro.medium.com/max/1200/1*3OJbS-uzx-cWO8g-fR8geg.png"
description: Hard to remember commands in Docker ?🤔
tags:
- Docker
- Docker UI
- Portainer 
---


# Pre-Requisite 

I am assuming that the readers have docker installed in their system and they are the part of the docker group. 

# Docker 

Docker is the de facto standard to build and share containerized apps - from desktop, to the cloud.

Docker is an open platform for developing, shipping, and running applications. Docker enables you to separate your applications from your infrastructure so you can deliver software quickly. With Docker, you can manage your infrastructure in the same ways you manage your applications. By taking advantage of Docker’s methodologies for shipping, testing, and deploying code quickly, you can significantly reduce the delay between writing code and running it in production.

Some basic commands we run to manage docker from terminal are :- 

```bash

# To check the pulled images 
docker images 
# To check the running containers 
docker ps 

# To check the container which we created 
docker ps -a

# To delete all the cotainers we created . Replace container id with yours 
docker rm </containerId>

# to Delete the pulled images
docker rmi </imageName>:</tagName>

# And a lot of other commands to start stop and many more we need to execute to manage our containers 

```

# Problems we face as a beginner 

When we create dockerfile and docker-compose we up the containers and forget to delete and mostly it runs in the backgroud which costs us a lot of memory and storage which we are not afare of . 

# Solution 

Although I prefer CLI commands to configure my docker still I belive not everyone can remember the commands and its get difficult to manage docker from the CLI . 

# Tools which can help us out 

There are multiple tools which can be a life saver in our daily life . Two most popular tools which I learned were 
1. Rancher
2. Portainer 

Although both are best for there own use cases .

I will be discussing the scenerio for the local environment which can help the beginners to run the container and manage the network, volumes graphically .
Whithin a click you can also launch container and the best part you dont need to write any DockerFile. 


# Portainer 

Let's quickly setup our portianer with terminal/Powershell. All we have to do is execute a single command.

```bash 

docker run -dit --name portainer -p 7777:9000 -v /var/run/docker.sock:/var/run/docker.sock portainer/portainer

```
![portainer_command](/assets/images/portainer/portainer_command.png)


Now we are all setup to manage docker container with our UI 

# Setting up the portianer UI 

We have to setup the credentials although we can manage portainer with policy's and ACL which I am not covering in this post .
But yes we can do it <br/>

![portainer_ui](/assets/images/portainer/admin.png)

Just Quickly set up the credentials .

## We can connect our portainer with remote machine container's 

Isn't it intresting the we can manage multiple system container from web UI.

![connect_remote](/assets/images/portainer/connect_remote.png)

## Setting up the local First!!

Well we will setup the local enviroment on docker first.

![connect_local](/assets/images/portainer/connect_local.png)

Just click hard on *Connect*

## Home Screen 

![local](/assets/images/portainer/local.png)


# Dasboard First look 

Now we are all setup to enjoy the comfort portainer provide us.
let's roll and explore 

![containers_dashboard](/assets/images/portainer/containers_dashboard.png)

So as you can see I have 8 images 6 volumes and 1 container which is portainer. 🤔

let's check the more amazing services portainer provides us :- 

# Get Ready 

To create a new conatainer

![new_conatiner](/assets/images/portainer/new_container.png)

To create container from template 

![template](/assets/images/portainer/template.png)

To launch containers in docker

![new_container](/assets/images/portainer/new_container.png)

I will update about Portainer vs Rancher Soon