#!/usr/bin/env bash

export LANGUAGE=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

export ENV=vagrant
if [ ! -d "/home/vagrant" ]; then
  ENV=prod
fi
echo "======= ENV:"$ENV

if [ $ENV == "vagrant" ]; then
	su - vagrant
	HOME=/home/vagrant
fi

export PROJ_NAME=tz-d3chart

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
cp $HOME/$PROJ_NAME/app/assets/* $HOME/$PROJ_NAME/dist/assets
if [ $ENV == "vagrant" ]; then
	rm -Rf /vagrant/dist
	cp -Rf $HOME/$PROJ_NAME/dist /vagrant/dist
fi

### [nginx] ###############################################################
if [ $ENV == "vagrant" ]; then
	echo cp /vagrant/etc/nginx/$PROJ_NAME.conf /etc/nginx/sites-enabled
	cp /vagrant/etc/nginx/$PROJ_NAME.conf /etc/nginx/sites-enabled
	sudo chown -R vagrant:vagrant $HOME
else
	echo cp $HOME/tz-d3chart/etc/nginx/${PROJ_NAME}2.conf /etc/nginx/sites-enabled
	sudo cp $HOME/tz-d3chart/etc/nginx/${PROJ_NAME}2.conf /etc/nginx/sites-enabled
	sudo chown -Rf topzone:staff /var/log/nginx/
fi

echo nginx -s stop && sudo nginx
sudo nginx -s stop && sudo nginx 

exit 0
