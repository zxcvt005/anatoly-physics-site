'use client';

import { useEffect, useLayoutEffect } from 'react';
import {
  markClientLifecycle,
  registerDiagnosticFlushHandler,
} from '@/lib/diagnostics/client/buffer';
import { initClientDiagnostics, markPageReady } from '@/lib/diagnostics/client/init';
import { sendClientDiagnosticBatch } from '@/lib/diagnostics/client/send';

let bootstrapped = false;

export function ClientDiagnosticsBootstrap() {
  useLayoutEffect(() => {
    if (!bootstrapped) {
      bootstrapped = true;
      registerDiagnosticFlushHandler((batch) => {
        sendClientDiagnosticBatch(batch, batch.reason === 'error');
      });
      initClientDiagnostics();
    }

    markClientLifecycle('APP_MOUNT_STARTED');
    markClientLifecycle('HYDRATION_STARTED');
  }, []);

  useEffect(() => {
    markClientLifecycle('APP_MOUNT_COMPLETED');
    markClientLifecycle('HYDRATION_COMPLETED');

    const idleCallback = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          markPageReady();
        })
      : undefined;

    const timeoutId = window.setTimeout(() => {
      markPageReady();
    }, 2500);

    return () => {
      if (idleCallback !== undefined) {
        window.cancelIdleCallback(idleCallback);
      }
      window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
