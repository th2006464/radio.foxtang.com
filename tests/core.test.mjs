import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStation, eligible, isPlayable, placeOf, makeShareURL} from '../src/app.js';
import {hash,randomFrom,projectGlobe,nearestLongitude,formatCoordinates,stationGenre} from '../src/scene.js';
import {stationQuery,onRequestGet} from '../functions/api/stations.js';
const raw={name:'Example Radio',stationuuid:'abc-def',url_resolved:'https://radio.example.com/live.mp3',country:'France',state:'Paris',language:'french',bitrate:192,geo_lat:'48.8',geo_long:'2.3'};
test('normalizes stations and rejects malformed entries',()=>{assert.equal(normalizeStation(raw).geo_lat,48.8);assert.equal(normalizeStation({...raw,name:''}),null);assert.equal(normalizeStation({...raw,url_resolved:'javascript:alert(1)'}),null);assert.equal(normalizeStation({...raw,geo_lat:null}).geo_lat,null);assert.equal(normalizeStation({...raw,geo_lat:999}).geo_lat,null);});
test('language and bitrate settings work without synthetic values',()=>{const station=normalizeStation(raw);assert.equal(eligible(station,{bitrate:128,language:'french'}),true);assert.equal(eligible(station,{bitrate:320,language:''}),false);assert.equal(eligible(station,{bitrate:0,language:'english'}),false);});
test('mixed content and unplayable HLS streams are skipped',()=>{assert.equal(isPlayable('http://foo.example/stream'),false);assert.equal(isPlayable('https://foo.example/stream.m3u8'),false);assert.equal(isPlayable('https://foo.example/stream.m3u8',true),true);assert.equal(isPlayable('https://foo.example/stream.mp3'),true);});
test('text and share URL helpers retain safe origins',()=>{assert.equal(placeOf(normalizeStation(raw)),'Paris · France');assert.equal(makeShareURL(normalizeStation(raw),'https://radio.foxtang.com/'),'https://radio.foxtang.com/?station=abc-def');});
test('sky generation deterministic, earth hides back hemisphere',()=>{assert.equal(hash('a'),hash('a'));assert.deepEqual([randomFrom(123)(),randomFrom(123)()],[randomFrom(123)(),randomFrom(123)()]);assert.equal(projectGlobe(0,0,0).visible,true);assert.equal(projectGlobe(0,180,0).visible,false);assert.equal(stationGenre({tags:'jazz, blues'}),1);});
test('catalog query allowlists keys, clamps limits and includes hidebroken',()=>{const q=stationQuery('https://foo.test/api/stations?limit=99999&name=BBC&admin=yes');assert.equal(q.get('limit'),'2000');assert.equal(q.get('name'),'BBC');assert.equal(q.get('admin'),null);assert.equal(q.get('hidebroken'),'true');assert.equal(stationQuery('https://example.test/api/stations?order=random').get('order'),'random');assert.equal(stationQuery('https://example.test/api/stations?uuid=abcd-1234-5678-9012').get('uuid'),'abcd-1234-5678-9012');assert.equal(stationQuery('https://example.test/api/stations?uuid=javascript:evil').has('uuid'),false);});
test('worker returns 503 when all mirrors are down',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('offline')};try{const response=await onRequestGet({request:new Request('https://radio.foxtang.com/api/stations?limit=10')});assert.equal(response.status,503);assert.equal((await response.json()).error,'Radio station directory temporarily unavailable');}finally{globalThis.fetch=old;}});

test('camera projection follows northern and eastern hemisphere accurately',()=>{
 const p=projectGlobe(51.5074,-.1278,-.1278,51.5074);
 assert.ok(p.z>.9999);assert.ok(Math.abs(p.x)<.0001);assert.ok(Math.abs(p.y)<.0001);
 assert.equal(projectGlobe(35.68,139.76,139.76,35.68).visible,true);
 assert.equal(projectGlobe(0,180,0,0).visible,false);
 assert.equal(nearestLongitude(350,10),370);assert.equal(nearestLongitude(-170,170),-190);
 assert.equal(formatCoordinates(31.23,121.47),'31.23°N · 121.47°E');
 assert.equal(formatCoordinates(-33.8,-58.3),'33.80°S · 58.30°W');
});
test('geo-located station sampling allowlist is safe',()=>{
 const p=stationQuery('https://example.test/api/stations?has_geo_info=true&order=random');
 assert.equal(p.get('has_geo_info'),'true');assert.equal(p.get('order'),'random');
 assert.equal(stationQuery('https://example.test/api/stations?has_geo_info=hack').get('has_geo_info'),'false');
});
