# -*- coding: utf-8 -*-

from util import CustomException, tohtml, generate_path_string
from traversal import cull_tree, \
    decide_govt_or_path, find_document_id_by_govt_id, \
    find_node_by_location, limit_tree_size, link_to_canonical
from lxml import etree
from flask import current_app
from queries import get_instrument_object, get_latest_instrument_object, fetch_parts, section_references
from query.elasticsearch import query_contains


def instrument_skeleton_response(instrument):
    # maybe, bake in first couple of parts
    return {
        'html_content': instrument.skeleton,
        'title': instrument.title,
        'full_title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        'attributes': instrument.attributes,
        'format': 'skeleton',
        'heights': instrument.heights,
        'parts': {},
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'full'
        }
    }


def instrument_full(instrument):
    if current_app.config.get('USE_SKELETON') and instrument.length > 100000:
        return instrument_skeleton_response(instrument)
    return {
        'html_content': etree.tostring(tohtml(instrument.get_tree()), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'full_title': instrument.title,
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
    preview = limit_tree_size(instrument.get_tree())
    return {
        'html_content': etree.tostring(tohtml(preview), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'full_title': instrument.title,
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
    #location = link_to_canonical(location)
    tree = find_node_by_location(instrument.get_tree(), location)
    full_location, _, __ = generate_path_string(tree[0])
    tree = cull_tree(tree)
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'full_title': full_location,
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


def instrument_govt_location(instrument, id, link_text):
    tree = decide_govt_or_path(instrument.get_tree(), id, link_text)
    full_location, _, location = generate_path_string(tree[0])
    tree = cull_tree(tree)
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'full_title': full_location,
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
    return {
        'parts': fetch_parts(instrument.id, parts=map(lambda p: int(p), parts))
    }


def query_instrument(args):
    find = args.get('find')

    if find == 'contains':
        return query_contains(args)

    if find == 'section_references':
        return section_references(args)

    govt_location = args.get('govt_location')
    if args.get('id', args.get('document_id')):
        id = args.get('id', args.get('document_id'))
        if isinstance(id, basestring) and id.startswith('DLM'):
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
        return instrument_more(instrument, args.get('parts').split(','))
    elif find == 'location':
        if args.get('location'):
            return instrument_location(instrument, args.get('location'))
    elif find == 'govt_location':
        if not govt_location:
            raise CustomException('No location specified')
        return instrument_govt_location(instrument, govt_location, args.get('link_text'))
    """ default is full instrument """
    return instrument_full(instrument)


def query_acts(args):
    raise CustomException('Not Implemented')
