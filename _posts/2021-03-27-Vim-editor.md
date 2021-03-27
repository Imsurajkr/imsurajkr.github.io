---
title: Why should we use vim ??
layout: post
post-image: "https://cdn.pixabay.com/photo/2012/04/11/11/39/text-editor-27620_960_720.png"
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

![Do_love](/assets/images/vim_editor/Do_Love.png)

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
![beginning](/assets/images/vim_editor/beginning.png)

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



```bash 

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

# Open the ~/.vimrc Add the following lines.
# I have listed all the plugins I tried.

call plug#begin('~/.vim/plugged')
Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
Plug 'scrooloose/nerdtree'
Plug 'scrooloose/nerdcommenter'
Plug 'altercation/vim-colors-solarized'
Plug 'itchyny/lightline.vim'
" call PlugInstall to install new plugins
call plug#end()

" basics
filetype plugin indent on
syntax on
"set nu
"set relativenumber
set incsearch
set ignorecase
set smartcase
set nohlsearch
set tabstop=2
set softtabstop=0
set shiftwidth=4
set expandtab
set nobackup
set noswapfile
set nowrap
set cursorcolumn
set cursorline

let mapleader = "\<Space>"
" navigate split screens easily
nmap <silent> <c-k> :wincmd k<CR>
nmap <silent> <c-j> :wincmd j<CR>
nmap <silent> <c-h> :wincmd h<CR>
nmap <silent> <c-l> :wincmd l<CR>

nmap <C-_>   <Plug>NERDCommenterToggle
nmap <C-_>   <Plug>NERDCommenterToggle<CR>gv

" solarized
syntax enable
set background=dark

" deoplete
let g:deoplete#enable_at_startup = 1
" use tab to forward cycle
inoremap <silent><expr><tab> pumvisible() ? "\<c-n>" : "\<tab>"
" use tab to backward cycle
inoremap <silent><expr><s-tab> pumvisible() ? "\<c-p>" : "\<s-tab>"
" Close the documentation window when completion is done
autocmd InsertLeave,CompleteDone * if pumvisible() == 0 | pclose | endif

"NERDTree
" How can I close vim if the only window left open is a NERDTree?
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif
" toggle NERDTree
map <C-n> :NERDTreeToggle<CR>
let g:NERDTreeChDirMode=2
let g:NERDTreeIgnore=['\.rbc$', '\~$', '\.pyc$', '\.db$', '\.sqlite$', '__pycache__', 'node_modules']
let g:NERDTreeSortOrder=['^__\.py$', '\/$', '*', '\.swp$', '\.bak$', '\~$']
let g:NERDTreeShowBookmarks=1
let g:nerdtree_tabs_focus_on_files=1
let g:NERDTreeMapOpenInTabSilent = '<RightMouse>'

if has('persistent_undo')        "check if your vim version supports it
    set undofile                 "turn on the feature  
    set undodir=$HOME/.vim/undo  "directory where the undo files will be stored
endif 

:source %
:PlugInstall

vim -c 'PlugInstall' 
# In case if source gives some error 
```

I know we can do a lot with vim . There's still a lot to learn but as far I have learned I have shared my vimrc files and some
Intresting tips that you can also apply for vim configurations.

# Let's Start 

```bash 
Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }
```
![deoplete](/assets/images/vim_editor/deoplete.png)

## Deoplete is for auto-completion in vim.

```bash 
Plug 'scrooloose/nerdtree'
```
![nerdTree](/assets/images/vim_editor/NerdTree.png)

## nerdtree is used for accessing multiple directories in Vim editor

```bash 
Plug 'scrooloose/nerdcommenter'
```
## Scrooloose/nerdcommenter to comment all lines with ctrl + / .
![linesCommenting](/assets/images/vim_editor/lines_commenting.png)

```bash 
Plug 'altercation/vim-colors-solarized'
```
## All the vibrant colours you are seeing in my vim
![nerdTree](/assets/images/vim_editor/Myvimrc.png)

```bash 
Plug 'itchyny/lightline.vim'
```
## the mode line which we see below
![lines](/assets/images/vim_editor/lines.png)


# I will update on how to use these plugin and leader keys how to map in next blog 