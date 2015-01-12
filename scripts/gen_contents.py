from lxml import etree
import sys
from lxml.etree import tostring
from itertools import chain
from flask import Flask
from operator import itemgetter
from flask import render_template, json, jsonify, g, request, send_from_directory
from flask.json import JSONEncoder
import psycopg2
import psycopg2.extras
import datetime
import os
import elasticsearch
import re
import os
from server import connect_db, get_act_exact, tohtml


def requires_contents(act):
	return len(act.xpath('.//toc'))

def create_contents(act):
	if requires_contents(act):
		print etree.tostring(tohtml(act, 'contents.xslt'), encoding='UTF-8', pretty_print=True)


if __name__ == "__main__":
	db = connect_db()
	create_contents(get_act_exact('Companies Act 1993', db=db))


