---
title: Why should we use vim ??
layout: post
post-image: "https://cdn.pixabay.com/photo/2013/07/13/13/41/bash-161382_960_720.png"
description: What a simple editor like vim can do hmmmmm??🤔
tags:
- vim
- vimrc
- editor_in_unix
---

# Vim Editor 
Vim is a highly configurable text editor built to make creating and changing any kind of text very efficient.<br />

# Is vim a Good editor ??

Vim is highly configurable and an editor that is really built for developers and operations.<br />
We want an editor which is quick. Modern IDE takes 1 or 2 minutes based on system configuration to load on machine. usally we have to download additional packages to make the IDE work more efficently.<br />

# Working with vim and ~/.vimrc

We will cover some topics to make our vim more interactive and cool.<br />
1. Sets 
2. Plugin Manager
3. Plugins 
4. remaps

# Steps 

Let's begin our journey with the more improvised vim editor so let's Roll.<br />

```bash
vim ~/.vimrc
# Inside the vimrc files updated these lines 

syntax on 
 
set noerrorbells
set tabstop=4 softtabstop=4
set shiftwidth=4
set expandtab
set smartindent
set nu
set nowrap
set smartcase 
set noswapfile
set nobackup
set undodir=~/.vim/undodir
set undofile 
set incsearch

set colorcolumn=80
highlight ColorColumn ctermbg=0 guibg=lightgrey

:source % 
:wq!
```
### syntax on 

Syntax on just gives you some basic high-lighting this works with a lot of language. But you may have to add some extension to work with every language 

### set noerrorbells

No beep occurs when an error message is displayed.

### set tabstop=4 softtabstop=4

tabstop meaning that it's only four characters long.<br />
softtabstop meaning that it's only four spaces long. <br />

### set shiftwidth=4

This will set tabstops every 4 spaces and set the shiftwidth (that amount we indent) as 4 spaces.

### set expandtab

Expand tab simply means converted from a tab character to spaces.<br />

### set smartindent

Vim do its best to indent.<br />

### set nu

We get nice line numbers <br />

### set nowrap 

It simply means if the lines go off the screen it appears on the next line so instead of that i want to just go off with no wrapping.

### set smartcase 

The 'smartcase' option only applies to search patterns that you type.<br />

### set noswapfile

To disable swap files from within vim. <br />

### set nobackup

To prevent new swap files from being created.<br />

### set undodir=~/.vim/undodir

Vim to keep its undo history . Happens with me a lot like once I saved the files I need to undo it but vim don't let me do this after this setup we have to create this directory

```bash 
mkdir ~/.vim/undodir -p 
ls ~/.vim
```
### set undofile

Save undos after file closes.<br />

### set incsearch

Incremental searches will be done. The Vim editor will start searching when you type the first character of the search string. As you type in more characters, the search is refined. :/search

### set colorcolumn=80

VIM will highlight anything that exceeds column 80.

### :source %
Its simply sources the files you have.Sourcing a file is 'executing' it<br />

Now we are done with the sets. Its improved the vim editor But we have to uncover more treasures in Vim 


# Let's start with plugin and autocomplete.

Well well we need some installer and plugin manager to do some cool stuff for us.

[link](https://github.com/junegunn/vim-plug) 

```bash 

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
# Open the ~/.vimrc Add the following lines.
# I have listed all the plugins I tried.

call plug#begin('~/.vim/plugged')

Plug 'morhetz/gruvbox'
Plug 'jremmen/vim-repgrep'
Plug 'tpope/vim-fugitive'
Plug 'vim-utils/vim-man'
Plug 'lyuts/vim-rtags'
Plug 'ctrlpvim/ctrlp.vim
Plug 'oblitum/youcompleteme'
plug 'mbbill/undotree'

call plug#end()
colorscheme gruvbox 
set background=dark

if executable('rg')
    let g:rg_derive_root='true'                                                 
endif

let g:ctrlp_user_command = ['.git/', 'git --git-dir=%s/.git ls-files -oc --exclude-standard']
let mapleader = " " 
let g:netrw_browse_split=2
let g:netrw_banner = 0
let g:newtrw_winsize = 25
let g:ctrlp_use_caching = 0

nnoremap <leader>h :wincmd h<CR>
nnoremap <leader>j :wincmd j<CR>
nnoremap <leader>k :wincmd k<CR>
nnoremap <leader>l :wincmd l<CR>
nnoremap <leader>u :UndotreeShow<CR>
nnoremap <leader>pv :wincmd v<bar> :Ex <bar> :vertical resize 30<CR>
nnoremap <Leader>ps :Rg<SPACE>
nnoremap <silent> <Leader>+ :vertical resize +5<CR>
nnoremap <silent> <Leader>- :vertical resize -5<CR>

nnoremap <silent> <Leader>gd :YcmCompleter GoTo<CR>
nnoremap <silent> <Leader>gf :YcmCompleter FixIt<CR>

vim -c 'PlugInstall' # In case if source gives some error 

# For Debian users I will update the methods soon for Mac and Windows
cd ~/.vim/plugged/youcompleteme
sudo apt install cmake
```




