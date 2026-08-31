'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

const PROFI_PROFILE_URL = 'https://profi.ru/profile/GusynAV';
const PROFI_WIDGET_SCRIPT = 'https://profi.ru/jqs/widget/widget.js';
const PROFI_WIDGET_ID = '3e84b5afaec1d23f74020eac92afabf1';
const PROFI_WIDGET_TYPE = '300x100';

let profiWidgetScriptRequested = false;

/**
 * Official widget.js registers init only on DOMContentLoaded. In React the
 * `.profi-widget` node appears after that event, and `profiWidgets.init` lives
 * inside the script IIFE (not on `window`). After widget.js loads we mirror
 * profiWidget.prototype.init/createFrame from the official script.
 */
function initProfiWidgetNodes() {
  const nodes = document.getElementsByClassName('profi-widget');

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.id || node.querySelector('iframe')) {
      continue;
    }

    const id = node.getAttribute('data-id');
    if (!id) {
      continue;
    }

    const type = node.getAttribute('data-type') || PROFI_WIDGET_TYPE;

    const frame = document.createElement('iframe');
    const size = getFrameSize(type);
    frame.style.boxShadow = '0 2px 8px rgba(8, 13, 74, 0.16)';
    frame.style.borderRadius = '4px';
    frame.style.width = size[0];
    frame.style.height = size[1];
    frame.style.maxWidth = '100%';
    frame.setAttribute('frameborder', '0');
    frame.src = `https://profi.ru/backoffice/widget.php?id=${id}&type=${type}`;

    node.innerHTML = '';
    node.appendChild(frame);
  }
}

function getFrameSize(type: string): [string, string] {
  switch (type) {
    case '210x190':
      return ['210px', '190px'];
    case '300x100':
      return ['300px', '100px'];
    default:
      return ['300px', '100px'];
  }
}

function mountProfiWidgetNode(host: HTMLDivElement) {
  const widget = document.createElement('div');
  widget.className = 'profi-widget';
  widget.setAttribute('data-id', PROFI_WIDGET_ID);
  widget.setAttribute('data-type', PROFI_WIDGET_TYPE);

  const link = document.createElement('a');
  link.href = PROFI_PROFILE_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Profi.ru';

  widget.append('Powered by ', link);
  host.replaceChildren(widget);

  return widget;
}

export function ProfiWidget() {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetMountedRef = useRef(false);
  const scriptLoadedRef = useRef(false);
  const [shouldLoadScript, setShouldLoadScript] = useState(false);

  const tryInitWidget = useCallback(() => {
    if (!widgetMountedRef.current || !scriptLoadedRef.current) {
      return;
    }

    initProfiWidgetNodes();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || widgetMountedRef.current) {
      return;
    }

    widgetMountedRef.current = true;
    mountProfiWidgetNode(host);

    if (!profiWidgetScriptRequested) {
      profiWidgetScriptRequested = true;
      setShouldLoadScript(true);
    } else if (document.getElementById('profi-ru-widget')) {
      scriptLoadedRef.current = true;
      tryInitWidget();
    }
  }, [tryInitWidget]);

  const handleScriptLoad = useCallback(() => {
    scriptLoadedRef.current = true;
    tryInitWidget();
  }, [tryInitWidget]);

  return (
    <>
      <div
        ref={hostRef}
        className="flex w-full max-w-[300px] flex-col items-center justify-center overflow-hidden"
        aria-label="Виджет Profi.ru"
      />

      {shouldLoadScript && (
        <Script
          id="profi-ru-widget"
          src={PROFI_WIDGET_SCRIPT}
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
        />
      )}
    </>
  );
}
