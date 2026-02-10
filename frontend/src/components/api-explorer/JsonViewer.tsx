/**
 * Recursive JSON viewer with syntax highlighting and collapsible nodes.
 * Uses MUI Typography with color styling — no external libraries.
 */

import { useState, useCallback, memo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ChevronRight as CollapseIcon,
} from '@mui/icons-material';

const MAX_ARRAY_ITEMS = 100;

interface JsonNodeProps {
  data: unknown;
  depth: number;
  keyName?: string;
  isLast?: boolean;
}

const JsonNode = memo(function JsonNode({ data, depth, keyName, isLast = true }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const indent = depth * 20;
  const comma = isLast ? '' : ',';

  // Null
  if (data === null) {
    return (
      <Box sx={{ pl: `${indent}px`, display: 'flex', alignItems: 'baseline' }}>
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontFamily: 'monospace', mr: 0.5 }}>
            "{keyName}"
          </Typography>
        )}
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', mr: 0.5 }}>: </Typography>
        )}
        <Typography component="span" variant="body2" sx={{ color: 'text.disabled', fontFamily: 'monospace', fontStyle: 'italic' }}>
          null{comma}
        </Typography>
      </Box>
    );
  }

  // Primitives
  if (typeof data !== 'object') {
    let color = 'text.primary';
    let display = String(data);

    if (typeof data === 'string') {
      color = 'success.main';
      display = `"${data}"`;
    } else if (typeof data === 'number') {
      color = 'warning.main';
    } else if (typeof data === 'boolean') {
      color = '#ab47bc'; // purple
    }

    return (
      <Box sx={{ pl: `${indent}px`, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontFamily: 'monospace', mr: 0.5 }}>
            "{keyName}"
          </Typography>
        )}
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', mr: 0.5 }}>: </Typography>
        )}
        <Typography
          component="span"
          variant="body2"
          sx={{
            color,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          {display}{comma}
        </Typography>
      </Box>
    );
  }

  // Array
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <Box sx={{ pl: `${indent}px`, display: 'flex', alignItems: 'baseline' }}>
          {keyName !== undefined && (
            <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontFamily: 'monospace', mr: 0.5 }}>
              "{keyName}"
            </Typography>
          )}
          {keyName !== undefined && (
            <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', mr: 0.5 }}>: </Typography>
          )}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
            []{comma}
          </Typography>
        </Box>
      );
    }

    const itemsToShow = data.slice(0, MAX_ARRAY_ITEMS);
    const remaining = data.length - MAX_ARRAY_ITEMS;

    return (
      <Box>
        <Box
          sx={{ pl: `${indent}px`, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={toggle}
        >
          <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
            {expanded ? <ExpandIcon sx={{ fontSize: 16 }} /> : <CollapseIcon sx={{ fontSize: 16 }} />}
          </IconButton>
          {keyName !== undefined && (
            <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontFamily: 'monospace', mr: 0.5 }}>
              "{keyName}"
            </Typography>
          )}
          {keyName !== undefined && (
            <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', mr: 0.5 }}>: </Typography>
          )}
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
            {expanded ? '[' : `[...] (${data.length} items)${comma}`}
          </Typography>
        </Box>
        {expanded && (
          <>
            {itemsToShow.map((item, i) => (
              <JsonNode
                key={i}
                data={item}
                depth={depth + 1}
                isLast={i === itemsToShow.length - 1 && remaining <= 0}
              />
            ))}
            {remaining > 0 && (
              <Box sx={{ pl: `${(depth + 1) * 20}px` }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontStyle: 'italic' }}>
                  ... and {remaining} more
                </Typography>
              </Box>
            )}
            <Box sx={{ pl: `${indent}px` }}>
              <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
                ]{comma}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    );
  }

  // Object
  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) {
    return (
      <Box sx={{ pl: `${indent}px`, display: 'flex', alignItems: 'baseline' }}>
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontFamily: 'monospace', mr: 0.5 }}>
            "{keyName}"
          </Typography>
        )}
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', mr: 0.5 }}>: </Typography>
        )}
        <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
          {`{}`}{comma}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{ pl: `${indent}px`, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        onClick={toggle}
      >
        <IconButton size="small" sx={{ p: 0, mr: 0.5 }}>
          {expanded ? <ExpandIcon sx={{ fontSize: 16 }} /> : <CollapseIcon sx={{ fontSize: 16 }} />}
        </IconButton>
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontFamily: 'monospace', mr: 0.5 }}>
            "{keyName}"
          </Typography>
        )}
        {keyName !== undefined && (
          <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace', mr: 0.5 }}>: </Typography>
        )}
        <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
          {expanded ? '{' : `{...} (${entries.length} keys)${comma}`}
        </Typography>
      </Box>
      {expanded && (
        <>
          {entries.map(([key, value], i) => (
            <JsonNode
              key={key}
              keyName={key}
              data={value}
              depth={depth + 1}
              isLast={i === entries.length - 1}
            />
          ))}
          <Box sx={{ pl: `${indent}px` }}>
            <Typography component="span" variant="body2" sx={{ fontFamily: 'monospace' }}>
              {'}'}{comma}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
});

interface JsonViewerProps {
  data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
  return (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'auto' }}>
      <JsonNode data={data} depth={0} />
    </Box>
  );
}
