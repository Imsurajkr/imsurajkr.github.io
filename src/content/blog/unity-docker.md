---
title: "Running the Unity Editor in a Docker Container"
description: "Unity's dependency chain — Android SDK, Java SDK and the rest — is a lot to set up by hand. Three commands put the whole editor in a container instead, on any machine that runs Docker."
pubDate: 2021-06-06
heroImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Z2FtaW5nfGVufDB8fDB8fHww"
tags:
  - "docker"
  - "containers"
  - "unity"
---
In the ever-evolving world of game development, the concept of Gaming as a Service (GaaS) has been a game-changer, pun intended. It's not just about playing games anymore; it's about creating immersive experiences with ease and efficiency. However, setting up a game development environment like Unity can often feel like navigating through a labyrinth, with its myriad of dependencies such as the Android SDK and Java SDK. But what if there was a way to simplify this process, making it as easy as launching an app?

Enter the world of containerization with Docker. Docker has revolutionized how we deploy applications by encapsulating them in containers, ensuring that they work seamlessly across any system. This breakthrough brings us to an innovative approach to game development: running Unity within Docker containers. This method not only streamlines the setup process but also democratizes game development by making it accessible to a broader range of creators, regardless of their hardware or operating system.

## The magic of Unity in Docker
Imagine starting your game development project without the hassle of manually installing and configuring Unity and its dependencies. By leveraging Docker, you can deploy a Unity environment with just a few commands, regardless of your base operating system. This approach not only saves time but also ensures that your development environment is clean and controlled, reducing the likelihood of version conflicts and dependency issues.

## A step-by-step guide
To dive into Unity game development with Docker, follow these simple steps:

### Prepare your local machine

Start by allowing your local machine to communicate with Docker containers:

```bash

xhost +local:docker

```

### Run Unity in a Docker container
Execute the following command to pull the Unity Editor image from Docker Hub and run it in a container:


```bash 

docker run -it --rm -e DISPLAY=$DISPLAY -v /tmp/.X11-unix/:/tmp/.X11-unix/ unityci/editor:ubuntu-2021.1.9f1-android-0.13.0 bash
```
### Launch Unity
Once inside the container, start the Unity Editor:

```bash
/opt/unity/Editor/Unity

```

And that's it! You're now ready to embark on your game development journey with Unity, all within a Docker container.


## Embracing GaaS with Docker and Unity
This approach to game development not only simplifies the setup process but also aligns with the principles of GaaS, offering a more flexible and scalable solution for developers. By containerizing the Unity environment, developers can easily share and replicate setups, collaborate with teams, and manage their development lifecycle more effectively.

Moreover, this method opens up new possibilities for integrating with cloud services and CI/CD pipelines, further enhancing the development workflow and enabling continuous delivery for game projects.

## Conclusion
The integration of Unity and Docker represents a significant leap forward in the democratization of game development. It offers a streamlined, efficient, and accessible path for developers to bring their creative visions to life, regardless of their technical background or resources.

By following the steps outlined in this post, you can set up a Unity development environment within minutes, freeing up more time to focus on what truly matters: creating amazing game experiences. So, why not give it a try and see how it transforms your game development workflow?

Happy Developing! 
