import JSONbig from 'json-bigint';

const losslessJSON = JSONbig({ storeAsString: true, protoAction: 'error', constructorAction: 'error' });

export function isCurrentSessionToken(requestToken: unknown, currentToken: string | null | undefined) {
  return typeof requestToken === 'string' && requestToken.length > 0 && requestToken === currentToken;
}

function normalizeIds(value: unknown, key = ''): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(item => normalizeIds(item, key.endsWith('Ids') ? 'id' : ''));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, normalizeIds(item, name)]));
  }
  return key === 'id' || key.endsWith('Id') || key === 'deleteFlag' ? String(value) : value;
}

/** Parse before Axios' default JSON.parse so Java Long IDs never lose digits. */
export function parseSystemResponse(value: string) {
  return normalizeIds(losslessJSON.parse(value)) as App.Service.Response<any>;
}
