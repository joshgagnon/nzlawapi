# -*- coding: utf-8 -*-

from util import CustomException, tohtml, generate_path_string, format_govt_date
from traversal import cull_tree, \
    decide_govt_or_path, find_document_id_by_govt_id, \
    nodes_from_path_string, limit_tree_size, link_to_canonical
from lxml import etree
from flask import current_app
from queries import get_instrument_object, get_latest_instrument_object, fetch_parts, section_references, section_versions
from query.elasticsearch import query_contains, query_contains_skeleton


def instrument_skeleton_response(instrument, args={}):
    result = {
        'html_content': instrument.skeleton,
        'title': instrument.title,
        'full_title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        "latest": instrument.attributes['latest'],
        "path": instrument.attributes['path'],
        "date_as_at_str": format_govt_date(instrument.attributes['date_as_at']),
        'format': 'skeleton',
        'heights': instrument.heights,
        'parts': {},
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'full'
        }
    }
    if args.get('highlight'):
        highlight = args.get('highlight')
        highlight_args = {
            'document_id': args.get('id', args.get('document_id')),
            'parts': args.get('parts'),
            'contains': highlight}
        result['title'] = '%s Find: %s' % (result['title'], args.get('highlight'))
        result.update(query_contains_skeleton(highlight_args))

    return result




def instrument_full(instrument, args={}):
    "who doesn't love magic numbers?"
    if current_app.config.get('USE_SKELETON') and instrument.length > 100000:
        return instrument_skeleton_response(instrument, args)
    return {
        'html_content': etree.tostring(tohtml(instrument.get_tree()), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'full_title': instrument.title,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        "latest": instrument.attributes['latest'],
        "path": instrument.attributes['path'],
        "date_as_at_str": format_govt_date(instrument.attributes['date_as_at']),
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
        "latest": instrument.attributes['latest'],
        "path": instrument.attributes['path'],
        "date_as_at_str": format_govt_date(instrument.attributes['date_as_at']),
        'format': 'preview',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'preview'
        }
    }


def instrument_location(instrument, location):
    def massage():
        return nodes_from_path_string(instrument.get_tree(), link_to_canonical(location))
    try:
        tree = nodes_from_path_string(instrument.get_tree(), location)
        if len(tree) == 1 and tree[0] == instrument.get_tree():
            raise CustomException('try again')
    except CustomException:
        tree = massage()
    full_location, _, path = generate_path_string(tree[0])
    tree = cull_tree(tree)
    return {
        'html_content': etree.tostring(tohtml(tree), encoding='UTF-8', method="html"),
        'title': instrument.title,
        'full_title': full_location,
        'document_id': instrument.id,
        'doc_type': 'instrument',
        "latest": instrument.attributes['latest'],
        "path": instrument.attributes['path'],
        "date_as_at_str": format_govt_date(instrument.attributes['date_as_at']),
        'format': 'fragment',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'location',
            'location': path
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
        "latest": instrument.attributes['latest'],
        "path": instrument.attributes['path'],
        "date_as_at_str": format_govt_date(instrument.attributes['date_as_at']),
        'format': 'fragment',
        'query': {
            'doc_type': 'instrument',
            'document_id': instrument.id,
            'find': 'govt_location',
            'govt_location': id
        }
    }


def instrument_more(document_id, parts, args={}):
    if args.get('highlight'):
        highlight = args.get('highlight')
        highlight_args = {
            'document_id': args.get('id', args.get('document_id')),
            'parts': args.get('parts'),
            'contains': highlight}
        return query_to_more(highlight_args, query_contains(highlight_args))
    else:
        return {
            'parts': fetch_parts(document_id, parts=map(lambda p: int(p), parts))
        }


def query_to_more(args, es_results):
    results = {}
    found = set()
    for hit in es_results['search_results']['hits']:
        results[hit['_id'].split('-', 1)[1]] = hit['highlight']['html'][0]
        found.add(hit['_id'].split('-', 1)[1])

    missing = set(unicode(args.get('parts')).split(',')).difference(found)
    print missing
    if(len(missing)):

        results.update(instrument_more(args.get('document_id'), missing)['parts'])

    return {'parts': results}


def query_instrument(args):
    find = args.get('find')
    if find == 'contains':
        return query_contains(args)
    if find == 'section_references':
        return section_references(args)
    if find == 'section_versions':
        return section_versions(args)
    if find == 'more':
        return instrument_more(args.get('document_id'), args.get('parts').split(','), args)

    govt_location = args.get('govt_location')
    if args.get('id', args.get('document_id')):
        doc_id = args.get('id', args.get('document_id'))
        if isinstance(doc_id, basestring) and doc_id.startswith('DLM'):
            govt_id = doc_id
            doc_id = find_document_id_by_govt_id(doc_id)
            instrument = get_instrument_object(doc_id)
            if instrument.attributes['govt_id'] != govt_id:
                find = 'govt_location'
                govt_location = govt_id
        else:
            instrument = get_instrument_object(doc_id)
    elif args.get('title'):
        instrument = get_latest_instrument_object(args.get('title'))
    else:
        raise CustomException('No instrument specified')

    if find == 'preview':
        return instrument_preview(instrument)

    elif find == 'location':
        if args.get('location'):
            return instrument_location(instrument, args.get('location'))
    elif find == 'govt_location':
        if not govt_location:
            raise CustomException('No location specified')
        return instrument_govt_location(instrument, govt_location, args.get('link_text'))
    """ default is full instrument """
    return instrument_full(instrument, args)


def query_acts(args):
    raise CustomException('Not Implemented')
