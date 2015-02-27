# -*- coding: utf-8 -*-

from util import CustomException, tohtml
from traversal import cull_tree, \
    find_node_by_govt_id, find_document_id_by_govt_id, \
    find_node_by_location, limit_tree_size
from lxml import etree
from flask import current_app
from queries import get_instrument_object, get_latest_instrument_object
import os


def act_skeleton_response(act):
    act.calculate_hooks()
    return {
        'skeleton': act.skeleton,
        'html_contents_page': etree.tostring(tohtml(act.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': act.title,
        'attributes': act.attributes,
        'parts': [],
        'document_id': act.id,
        'doc_type': 'instrument',
        'partial': True
    }


def instrument_full(instrument):
    return {
        'html_content': etree.tostring(tohtml(instrument.tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(instrument.tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'full',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'full'
        }
    }


def instrument_preview(instrument):
    preview = limit_tree_size(instrument.tree)
    return {
        'html_content': etree.tostring(tohtml(preview), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'preview',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'preview'
        }
    }


def instrument_location(instrument, location):
    tree = cull_tree(find_node_by_location(instrument.tree, location))
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'fragment',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'location',
            'location': location
        }
    }


def instrument_govt_location(instrument, id):
    tree = cull_tree(find_node_by_govt_id(instrument.tree, id))
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'html_contents_page': etree.tostring(tohtml(tree, os.path.join('xslt', 'contents.xslt')), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'fragment',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'govt_location',
            'govt_location': id
        }
    }


def instrument_more(instrument, parts):
    act_part_response(instrument, parts)
    #todo
    return {}


def query_instrument(args):
    find = args.get('find')
    govt_location = args.get('govt_location')
    if args.get('id', args.get('document_id')):
        id = args.get('id', args.get('document_id'))
        if id.startswith('DLM'):
            govt_id = id
            id = find_document_id_by_govt_id(id)
            instrument = get_instrument_object(
                id,
                replace=current_app.config.get('REPROCESS_DOCS'))
            if instrument.attributes['govt_id'] != govt_id:
                find = 'govt_location'
                govt_location = govt_id
        else:
            instrument = get_instrument_object(
                id,
                replace=current_app.config.get('REPROCESS_DOCS'))
    elif args.get('title'):
        instrument = get_latest_instrument_object(
            args.get('title'),
            replace=current_app.config.get('REPROCESS_DOCS'))
    else:
        raise CustomException('No instrument specified')

    if find == 'preview':
        return instrument_preview(instrument)
    elif find == 'more':
        return instrument_more(instrument, args.getlist('requested_parts[]'))
    elif find == 'location':
        if not args.get('location'):
            raise CustomException('No location specified')
        return instrument_location(instrument, args.get('location'))
    elif find == 'govt_location':
        if not govt_location:
            raise CustomException('No location specified')
        return instrument_govt_location(instrument, govt_location)
    # default is full
    return instrument_full(instrument)


def query_acts(args):
    raise CustomException('Not Implemented')

