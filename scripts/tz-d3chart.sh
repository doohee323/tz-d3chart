#!/usr/bin/env bash

su - vagrant

export LANGUAGE=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

PROJ_NAME=tz-d3chart
HOME=/home/vagrant

sudo apt-get update
sudo apt-get install nginx -y
sudo apt-get install wget -y --force-yes
sudo apt-get install curl -y --force-yes
sudo apt-get install git -y --force-yes

### [build app] ###############################################################
cd $HOME
git clone https://github.com/doohee323/$PROJ_NAME.git
cd $PROJ_NAME

sudo apt-get install npm -y --force-yes
sudo npm cache clean -f 
sudo npm install -g n 
sudo n stable
npm install
sudo npm install -g bower
bower --allow-root install
sudo npm install -g grunt-cli
grunt build

### [deploy app] ###############################################################
mkdir -p $HOME/$PROJ_NAME/dist/assets
cp $HOME/$PROJ_NAME/app/assets $HOME/$PROJ_NAME/dist/assets
rm -Rf /vagrant/dist
cp -Rf $HOME/$PROJ_NAME/dist /vagrant/dist

### [nginx] ###############################################################
echo cp /vagrant/etc/nginx/$PROJ_NAME.conf /etc/nginx/sites-enabled
cp /vagrant/etc/nginx/$PROJ_NAME.conf /etc/nginx/sites-enabled

echo nginx -s stop && nginx
sudo nginx -s stop && nginx 

sudo chown -R vagrant:vagrant $HOME

exit 0
