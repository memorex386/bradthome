"""Prints the résumé PDFs (spec 015) with WeasyPrint, in the pinned container.

    python3 print.py DIST SOURCE OUTPUT [SOURCE OUTPUT ...]

SOURCE and OUTPUT are paths inside DIST, the built site. Each PDF is PDF/A-2a
and declares PDF/UA-1, so it passes veraPDF against both (D139). WeasyPrint
writes PDF/A-2a's metadata; this adds PDF/UA-1's identification to the same
XMP packet, with the extension schema PDF/A needs for it. The output has no
dates and no random IDs, so the same source prints the same bytes (SC-004).
Only files inside DIST load: the page's fonts are site paths like
/_astro/inter.woff2, and nothing is fetched from the network.
"""

import sys
from pathlib import Path
from urllib.parse import unquote, urlparse
from xml.etree.ElementTree import SubElement, fromstring, register_namespace, tostring

import weasyprint
from weasyprint.pdf import metadata
from weasyprint.urls import FatalURLFetchingError, URLFetcher

RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
PDFUAID = 'http://www.aiim.org/pdfua/ns/id/'
EXTENSION = 'http://www.aiim.org/pdfa/ns/extension/'
SCHEMA = 'http://www.aiim.org/pdfa/ns/schema#'
PROPERTY = 'http://www.aiim.org/pdfa/ns/property#'

# veraPDF reads the extension schema by these prefixes, so ElementTree must keep them.
for prefix, uri in {
    'rdf': RDF,
    'pdfuaid': PDFUAID,
    'pdfaExtension': EXTENSION,
    'pdfaSchema': SCHEMA,
    'pdfaProperty': PROPERTY,
}.items():
    register_namespace(prefix, uri)

_rdf_of = metadata.DocumentMetadata.generate_rdf_metadata


def _with_pdfua(self, variant, version, conformance):
    """PDF/A-2a's RDF, plus PDF/UA-1's identification and its extension schema."""
    rdf = fromstring(_rdf_of(self, variant, version, conformance))
    ua = SubElement(rdf, f'{{{RDF}}}Description', {f'{{{RDF}}}about': ''})
    ua.set(f'{{{PDFUAID}}}part', '1')
    description = SubElement(rdf, f'{{{RDF}}}Description', {f'{{{RDF}}}about': ''})
    bag = SubElement(SubElement(description, f'{{{EXTENSION}}}schemas'), f'{{{RDF}}}Bag')
    schema = SubElement(bag, f'{{{RDF}}}li', {f'{{{RDF}}}parseType': 'Resource'})
    SubElement(schema, f'{{{SCHEMA}}}schema').text = 'PDF/UA Universal Accessibility Schema'
    SubElement(schema, f'{{{SCHEMA}}}namespaceURI').text = PDFUAID
    SubElement(schema, f'{{{SCHEMA}}}prefix').text = 'pdfuaid'
    properties = SubElement(SubElement(schema, f'{{{SCHEMA}}}property'), f'{{{RDF}}}Seq')
    part = SubElement(properties, f'{{{RDF}}}li', {f'{{{RDF}}}parseType': 'Resource'})
    SubElement(part, f'{{{PROPERTY}}}name').text = 'part'
    SubElement(part, f'{{{PROPERTY}}}valueType').text = 'Integer'
    SubElement(part, f'{{{PROPERTY}}}category').text = 'internal'
    SubElement(part, f'{{{PROPERTY}}}description').text = 'Indicates, which part of ISO 14289 standard is followed'
    return tostring(rdf, encoding='utf-8')


metadata.DocumentMetadata.generate_rdf_metadata = _with_pdfua


class BuildFetcher(URLFetcher):
    """Loads a site path, such as /_astro/inter.woff2, from DIST, and refuses anything else."""

    def __init__(self, dist: Path):
        super().__init__(allowed_protocols=('file',), fail_on_errors=True)
        self._root = dist.resolve()

    def fetch(self, url, headers=None):
        parsed = urlparse(url)
        if parsed.scheme != 'file':
            raise FatalURLFetchingError(f'The résumé loads only files from the build, not {url}.')
        path = Path(unquote(parsed.path))
        # A site path like /_astro/x.woff2 resolves from the root of the drive; read it from DIST instead.
        candidate = path.resolve() if path.resolve().is_relative_to(self._root) else (self._root / path.relative_to(path.anchor)).resolve()
        if not candidate.is_relative_to(self._root) or not candidate.is_file():
            raise FatalURLFetchingError(f'The résumé loads only files from the build, not {url}.')
        return super().fetch(candidate.as_uri(), headers)


def main(argv):
    if len(argv) < 3 or len(argv) % 2 == 0:
        print('Usage: print.py DIST SOURCE OUTPUT [SOURCE OUTPUT ...]', file=sys.stderr)
        return 2
    dist = Path(argv[0]).resolve()
    fetcher = BuildFetcher(dist)
    for source, output in zip(argv[1::2], argv[2::2]):
        html = weasyprint.HTML(filename=str(dist / source), url_fetcher=fetcher)
        target = dist / output
        target.parent.mkdir(parents=True, exist_ok=True)
        html.write_pdf(str(target), pdf_variant='pdf/a-2a')
        print(f'printed {output}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
