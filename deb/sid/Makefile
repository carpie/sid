# Makefile for sid package
# 
# Creates a debian that will install sid in /opt
#
NAME = sid
VERSION ?= 1.0.0
DESTDIR ?= /
TAR_SRC = src node_modules/
TAR_DEB = Makefile
PKG_DIR = /opt/$(NAME)

.PHONY: default deb orig install

# There's no "build" step for JS projects, but debuild needs a default target
default:
	@echo "Ready for installation"

deb: orig
	debuild -us -uc -i -b --lintian-opts --profile debian

orig:
	tar zcf ../$(NAME)_$(VERSION).orig.tar.gz -C ../.. $(TAR_SRC)
	tar zcf ../$(NAME)_$(VERSION).orig.tar.gz $(TAR_DEB)

install:
	mkdir -p $(DESTDIR)/$(PKG_DIR)
	cp -r ../../node_modules $(DESTDIR)/$(PKG_DIR)
	cp -r ../../src $(DESTDIR)/$(PKG_DIR)
	cp debian/$(NAME).sh $(DESTDIR)/$(PKG_DIR)
	mkdir -p $(DESTDIR)/lib/systemd/system
	cp debian/$(NAME).service $(DESTDIR)/lib/systemd/system/

deb-clean:
	debuild clean
	rm -f ../$(NAME)_$(VERSION)*.build
	rm -f ../$(NAME)_$(VERSION)*.changes
	rm -f ../$(NAME)_$(VERSION)*.tar.gz
