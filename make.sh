#!/usr/bin/env bash

wget https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-i386-vagrant-disk1.box

vagrant box remove 'trusty' -f
vagrant box add 'trusty' './trusty-server-cloudimg-i386-vagrant-disk1.box'
vagrant destroy -f && vagrant up

