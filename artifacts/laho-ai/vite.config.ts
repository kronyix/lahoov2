import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const port = Number(process.env.PORT || 3000);
const basePath = process.env.BASE_PATH || '/';

function mockApiPlugin(): Plugin {
  return {
    name: 'laho-mock-api',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url || '';
        if (!url.startsWith('/api')) {
          return next();
        }

        const parsedUrl = new URL(url, 'http://localhost');
        const pathname = parsedUrl.pathname;

        const sendJson = (status: number, data: unknown) => {
          res.writeHead(status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          });
          res.end(JSON.stringify(data));
        };

        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          });
          return res.end();
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          let parsedBody: Record<string, unknown> = {};
          if (body) {
            try {
              parsedBody = JSON.parse(body);
            } catch {
              // ignore
            }
          }

          if (pathname === '/api/healthz') {
            return sendJson(200, { status: 'healthy' });
          }

          if (pathname === '/api/profiles/me') {
            return sendJson(200, {
              role: 'worker',
              displayName: 'Dr. Priya Sharma',
              city: 'Sitapur',
              facilityName: 'Kheri Rural BSU',
              communityName: 'Awadh Blood Circle',
              workerVerified: true,
            });
          }

          if (pathname === '/api/dashboard') {
            const role = parsedUrl.searchParams.get('role') || 'worker';
            return sendJson(200, {
              role,
              averageDispatchMinutes: 7.4,
              activeRequests: 2,
              activeNodes: 1428,
              coldChainIntegrity: 99.98,
              wastagePreventedLiters: 18.6,
              openDeficits: 3,
              livesImpacted: 84,
            });
          }

          if (pathname === '/api/inventory') {
            return sendJson(200, [
              {
                id: 'BSU-041',
                bloodGroup: 'O−',
                collectedAt: '2025-04-12T08:20:00Z',
                expiresAt: '2025-05-24T08:20:00Z',
                daysRemaining: 4,
                origin: 'Kheri Rural BSU',
                temperatureC: 4.1,
                risk: 'watch',
                status: 'Available',
                temperatureLog: [
                  { recordedAt: '2025-05-19T06:00:00Z', temperatureC: 3.8 },
                  { recordedAt: '2025-05-19T12:00:00Z', temperatureC: 4.1 },
                  { recordedAt: '2025-05-19T18:00:00Z', temperatureC: 4.2 },
                ],
              },
              {
                id: 'BSU-056',
                bloodGroup: 'AB+',
                collectedAt: '2025-04-18T10:40:00Z',
                expiresAt: '2025-05-30T10:40:00Z',
                daysRemaining: 10,
                origin: 'Barabanki Storage Unit',
                temperatureC: 3.7,
                risk: 'safe',
                status: 'Available',
                temperatureLog: [
                  { recordedAt: '2025-05-19T06:00:00Z', temperatureC: 3.6 },
                  { recordedAt: '2025-05-19T12:00:00Z', temperatureC: 3.7 },
                ],
              },
            ]);
          }

          if (pathname.startsWith('/api/inventory/')) {
            const unitId = pathname.replace('/api/inventory/', '');
            return sendJson(200, {
              id: unitId,
              bloodGroup: 'O−',
              collectedAt: '2025-04-12T08:20:00Z',
              expiresAt: '2025-05-24T08:20:00Z',
              daysRemaining: 4,
              origin: 'Kheri Rural BSU',
              temperatureC: 4.1,
              risk: 'watch',
              status: 'Available',
              temperatureLog: [
                { recordedAt: '2025-05-19T06:00:00Z', temperatureC: 3.8 },
                { recordedAt: '2025-05-19T12:00:00Z', temperatureC: 4.1 },
                { recordedAt: '2025-05-19T18:00:00Z', temperatureC: 4.2 },
              ],
            });
          }

          if (pathname === '/api/emergency-requests' && req.method === 'POST') {
            return sendJson(201, {
              id: `REQ-${Math.floor(Math.random() * 800 + 200)}`,
              bloodGroup: parsedBody.bloodGroup || 'O−',
              units: parsedBody.units || 2,
              urgency: parsedBody.urgency || 'critical',
              clinicalSummary: parsedBody.clinicalSummary || '',
              destination: parsedBody.destination || 'District Hospital',
              status: 'submitted_for_coordination',
              createdAt: new Date().toISOString(),
            });
          }

          if (pathname === '/api/shipments') {
            return sendJson(200, [
              {
                id: 'RLY-208',
                requestId: 'REQ-208',
                bloodGroup: 'O−',
                units: 2,
                origin: 'Kheri Rural BSU',
                destination: 'District Hospital, Sitapur',
                status: 'In transit',
                temperatureC: 4.0,
                stages: [
                  { label: 'Kheri BSU', status: 'complete', etaMinutes: 0 },
                  { label: 'Lucknow relay hub', status: 'active', etaMinutes: 18 },
                  { label: 'Sitapur district hospital', status: 'pending', etaMinutes: 61 },
                ],
              },
              {
                id: 'RLY-211',
                requestId: 'REQ-211',
                bloodGroup: 'B+',
                units: 1,
                origin: 'Ayodhya Storage Unit',
                destination: 'CHC, Rudauli',
                status: 'Awaiting transfer',
                temperatureC: 3.9,
                stages: [
                  { label: 'Ayodhya BSU', status: 'complete', etaMinutes: 0 },
                  { label: 'Bus relay', status: 'active', etaMinutes: 34 },
                  { label: 'CHC, Rudauli', status: 'pending', etaMinutes: 82 },
                ],
              },
            ]);
          }

          if (pathname.includes('/reroute') && req.method === 'POST') {
            return sendJson(200, {
              status: 'reroute_requested',
              destination: parsedBody.destination || 'Updated Facility',
            });
          }

          if (pathname === '/api/credit-ledger') {
            return sendJson(200, [
              { id: 'CR-018', clinic: 'CHC Maholi', bloodGroup: 'O−', units: 2, status: 'open', createdAt: '2025-05-18T13:20:00Z' },
              { id: 'CR-013', clinic: 'PHC Sadr', bloodGroup: 'B+', units: 1, status: 'matched', createdAt: '2025-05-17T09:15:00Z' },
            ]);
          }

          if (pathname.includes('/voucher') && req.method === 'POST') {
            const token = Math.random().toString(36).substring(2, 10).toUpperCase();
            return sendJson(200, {
              referenceCode: `VOUCH-${token}`,
              message: `Lahoo AI blood grid: voluntary replacement donation needed to balance credit. Voucher: ${token}`,
              deepLink: `https://wa.me/?text=Lahoo%20AI%20blood%20grid%20voucher%20${token}`,
            });
          }

          if (pathname === '/api/deficits') {
            return sendJson(200, [
              { id: 'DEF-01', story: 'Urgent need for emergency surgery support. Two units required before the evening transfer.', location: 'Sitapur District Hospital', bloodGroup: 'O−', units: 2, distanceKm: 8.4, urgency: 'critical', expiresAt: '2025-05-20T19:00:00Z', donationHub: 'District Blood Centre, Sitapur', scope: 'district' },
              { id: 'DEF-02', story: 'A local reserve is below its minimum threshold after a high-demand weekend.', location: 'CHC Maholi', bloodGroup: 'B+', units: 1, distanceKm: 16.2, urgency: 'urgent', expiresAt: '2025-05-21T12:00:00Z', donationHub: 'Maholi Community Health Centre', scope: 'district' },
              { id: 'DEF-03', story: 'Rare subtype support requested for a regional care network. Coarse location shared.', location: 'Awadh regional network', bloodGroup: 'Bombay (hh)', units: 1, distanceKm: 31.8, urgency: 'urgent', expiresAt: '2025-05-21T20:00:00Z', donationHub: 'Lucknow Regional Blood Centre', scope: 'rare' },
            ]);
          }

          if (pathname.includes('/claim') && req.method === 'POST') {
            return sendJson(201, {
              id: `CLM-${Math.floor(Math.random() * 800 + 100)}`,
              status: 'reserved_pending_hub_confirmation',
              lockedUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
              confirmationMessage: 'Your claim is reserved for 12 hours. Confirm the appointment with the donation hub before traveling.',
            });
          }

          if (pathname === '/api/impact-timeline') {
            return sendJson(200, [
              { id: 'IMP-14', occurredAt: '2025-05-02T10:00:00Z', title: 'A local deficit was settled', detail: 'One unit of B+ helped restore a nearby reserve.', location: 'Central Awadh', bloodGroup: 'B+', status: 'Settled' },
              { id: 'IMP-09', occurredAt: '2025-02-14T08:45:00Z', title: 'Your donation entered the network', detail: 'A unit was routed through the sovereign blood grid.', location: 'North Lucknow district', bloodGroup: 'O+', status: 'Delivered' },
            ]);
          }

          if (pathname === '/api/guardian') {
            if (req.method === 'PUT') {
              return sendJson(200, parsedBody);
            }
            return sendJson(200, {
              active: true,
              radiusKm: 15,
              startTime: '08:00',
              endTime: '22:00',
              bloodGroups: ['O−', 'B−', 'Bombay (hh)'],
            });
          }

          if (pathname === '/api/communities') {
            return sendJson(200, [
              { id: 'COM-01', name: 'Awadh Blood Circle', members: 184, deficitsSettled: 37, wastagePreventedLiters: 18.6, progressPercent: 72, adoptedBsu: 'Kheri Rural BSU' },
              { id: 'COM-02', name: 'Sitapur Neighbourhood Network', members: 96, deficitsSettled: 22, wastagePreventedLiters: 11.2, progressPercent: 48, adoptedBsu: 'Maholi Community BSU' },
            ]);
          }

          if (pathname === '/api/drives' && req.method === 'POST') {
            return sendJson(201, {
              id: `COM-${Math.floor(Math.random() * 800 + 100)}`,
              name: parsedBody.communityName || 'New Community Drive',
              members: 1,
              deficitsSettled: 0,
              wastagePreventedLiters: 0,
              progressPercent: 0,
              adoptedBsu: parsedBody.adoptedBsu || 'Kheri Rural BSU',
            });
          }

          if (pathname === '/api/voice-intents' && req.method === 'POST') {
            return sendJson(200, {
              transcript: 'Need two units of O negative blood urgently for emergency obstetric surgery',
              languageCode: parsedBody.languageCode || 'hi-IN',
              bloodGroup: 'O−',
              units: 2,
              urgency: 'critical',
              clinicalSummary: 'Emergency obstetric surgery support, immediate transit required',
              requiresConfirmation: true,
            });
          }

          return sendJson(200, {});
        });
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    mockApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
