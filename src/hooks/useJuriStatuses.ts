/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export function useJuriStatuses() {
  const [statuses, setStatuses] = useState({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
    7: true,
    8: true,
    9: true,
    10: true
  });

  useEffect(() => {
    // Local offline/online sync can listen to storage events or heartbeat
    const handleSync = () => {
      // Keep everything awake and healthy in localhost
      setStatuses({
        1: true,
        2: true,
        3: true,
        4: true,
        5: true,
        6: true,
        7: true,
        8: true,
        9: true,
        10: true
      });
    };

    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return statuses;
}
