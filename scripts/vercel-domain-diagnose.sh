#!/usr/bin/env bash
# Domain ownership scan. Avoid pipefail+head (previously aborted at exit 32).
set -eu
AUTH="Authorization: Bearer ${VERCEL_TOKEN}"
json() { python3 -m json.tool 2>/dev/null || cat; }

echo '=== whoami ==='
vercel whoami --token "$VERCEL_TOKEN" || true
echo "ORG=$VERCEL_ORG_ID PROJECT=$VERCEL_PROJECT_ID"
echo '=== teams ==='
curl -sS -H "$AUTH" 'https://api.vercel.com/v2/teams' | json
echo '=== project (trimmed) ==='
curl -sS -H "$AUTH" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_ORG_ID" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print({k:d.get(k) for k in ("id","name","accountId","alias","live","framework")})'
echo '=== domains on configured project ==='
curl -sS -H "$AUTH" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/domains?teamId=$VERCEL_ORG_ID" | json
echo '=== domain app.grupolivelab.com.br ==='
curl -sS -H "$AUTH" \
  'https://api.vercel.com/v5/domains/app.grupolivelab.com.br' | json || true
echo '=== domain grupolivelab.com.br ==='
curl -sS -H "$AUTH" \
  'https://api.vercel.com/v5/domains/grupolivelab.com.br' | json || true
echo '=== aliases containing grupolivelab ==='
curl -sS -H "$AUTH" \
  'https://api.vercel.com/v4/aliases?limit=100' | python3 -c '
import sys, json
d = json.load(sys.stdin)
for a in d.get("aliases", []):
    blob = " ".join(str(a.get(k) or "") for k in ("alias", "domain", "deploymentId", "target"))
    if "grupolivelab" in blob:
        print(json.dumps(a, indent=2))
'
echo '=== personal projects ==='
curl -sS -H "$AUTH" 'https://api.vercel.com/v9/projects?limit=100' \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(p["id"], p["name"]) for p in d.get("projects",[])]'
teams=$(curl -sS -H "$AUTH" 'https://api.vercel.com/v2/teams' \
  | python3 -c 'import sys,json; print(" ".join(t["id"] for t in json.load(sys.stdin).get("teams",[])))')
for tid in $teams; do
  echo "== projects team $tid =="
  curl -sS -H "$AUTH" "https://api.vercel.com/v9/projects?teamId=$tid&limit=100" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(p["id"], p["name"]) for p in d.get("projects",[])]'
  ids=$(curl -sS -H "$AUTH" "https://api.vercel.com/v9/projects?teamId=$tid&limit=100" \
    | python3 -c 'import sys,json; print(" ".join(p["id"] for p in json.load(sys.stdin).get("projects",[])))')
  for pid in $ids; do
    curl -sS -H "$AUTH" \
      "https://api.vercel.com/v9/projects/$pid/domains?teamId=$tid" \
      | pid="$pid" python3 -c '
import sys, json, os
d = json.load(sys.stdin)
names = [x.get("name") for x in d.get("domains", [])]
if any("grupolivelab" in (n or "") for n in names):
    print("FOUND on", os.environ["pid"], names)
'
  done
done
echo '=== live version.json ==='
curl -sS -H 'Cache-Control: no-cache' 'https://app.grupolivelab.com.br/version.json' || true
echo
