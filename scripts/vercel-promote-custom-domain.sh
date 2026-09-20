#!/usr/bin/env bash
# Promote An6ny33Ys6ppaJMUL3xwqybb8Rvr (or latest production) onto app.grupolivelab.com.br
# and print domain ownership facts. Never prints token values.
set -eu
# Intentionally NOT pipefail — json.tool|head previously killed diagnose with exit 32.

DEPLOY_ID="${DEPLOY_ID:-An6ny33Ys6ppaJMUL3xwqybb8Rvr}"
# Vercel API expects the dpl_ prefix on deployment ids.
case "$DEPLOY_ID" in
  dpl_*) ;;
  *) DEPLOY_ID="dpl_${DEPLOY_ID}" ;;
esac
DOMAIN="${DOMAIN:-app.grupolivelab.com.br}"
AUTH="Authorization: Bearer ${VERCEL_TOKEN}"

json() { python3 -m json.tool 2>/dev/null || cat; }

echo "=== whoami ==="
vercel whoami --token "$VERCEL_TOKEN" || true
echo "ORG=${VERCEL_ORG_ID:-} PROJECT=${VERCEL_PROJECT_ID:-} DEPLOY_ID=$DEPLOY_ID DOMAIN=$DOMAIN"

echo "=== teams (slug/id/name only) ==="
curl -sS -H "$AUTH" 'https://api.vercel.com/v2/teams' | python3 -c '
import sys,json
d=json.load(sys.stdin)
for t in d.get("teams",[]):
  print(t.get("id"), t.get("slug"), t.get("name"), t.get("billing",{}).get("plan"))
print("count", len(d.get("teams",[])))
'

echo "=== project domains (configured project) ==="
curl -sS -H "$AUTH" \
  "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_ORG_ID}" | json

echo "=== domain lookup $DOMAIN ==="
curl -sS -H "$AUTH" "https://api.vercel.com/v5/domains/${DOMAIN}" | json || true

echo "=== domain lookup grupolivelab.com.br ==="
curl -sS -H "$AUTH" 'https://api.vercel.com/v5/domains/grupolivelab.com.br' | json || true

echo "=== try add domain to configured project ==="
ADD_RESP=$(curl -sS -w '\nHTTP:%{http_code}' -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"name\":\"${DOMAIN}\"}" \
  "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_ORG_ID}" || true)
echo "$ADD_RESP"
echo "=== try verify domain (TXT may already be live) ==="
VERIFY_RESP=$(curl -sS -w '\nHTTP:%{http_code}' -X POST -H "$AUTH" \
  "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${DOMAIN}/verify?teamId=${VERCEL_ORG_ID}" || true)
echo "$VERIFY_RESP"
echo "=== domain status after verify ==="
curl -sS -H "$AUTH" \
  "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${DOMAIN}?teamId=${VERCEL_ORG_ID}" | json || true

echo "=== resolve deployment url for $DEPLOY_ID ==="
DEP_JSON=$(curl -sS -H "$AUTH" \
  "https://api.vercel.com/v13/deployments/${DEPLOY_ID}?teamId=${VERCEL_ORG_ID}" || true)
echo "$DEP_JSON" | python3 -c '
import sys,json
try:
  d=json.load(sys.stdin)
except Exception as e:
  print("parse_error", e); sys.exit(0)
print("id", d.get("id") or d.get("uid"))
print("url", d.get("url"))
print("readyState", d.get("readyState"))
print("meta.gitCommitSha", (d.get("meta") or {}).get("githubCommitSha") or (d.get("meta") or {}).get("gitCommitSha"))
print("error", d.get("error"))
' || echo "$DEP_JSON" | head -c 500

DEP_HOST=$(echo "$DEP_JSON" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("url") or "")' 2>/dev/null || true)
if [ -n "$DEP_HOST" ]; then
  echo "=== vercel alias set ${DEP_HOST} -> ${DOMAIN} ==="
  set +e
  vercel alias set "$DEP_HOST" "$DOMAIN" --token "$VERCEL_TOKEN" --scope "${VERCEL_ORG_ID}" 2>&1
  ALIAS_RC=$?
  set -e
  echo "alias_exit=$ALIAS_RC"
else
  echo "=== skip alias: no deployment host ==="
fi

echo "=== scan all accessible projects for grupolivelab domains ==="
# personal
curl -sS -H "$AUTH" 'https://api.vercel.com/v9/projects?limit=100' | python3 -c '
import sys,json
d=json.load(sys.stdin)
print("personal_project_count", len(d.get("projects",[])))
for p in d.get("projects",[]):
  print("personal", p.get("id"), p.get("name"))
'
teams=$(curl -sS -H "$AUTH" 'https://api.vercel.com/v2/teams' \
  | python3 -c 'import sys,json; print(" ".join(t["id"] for t in json.load(sys.stdin).get("teams",[])))')
for tid in $teams; do
  echo "== team $tid =="
  curl -sS -H "$AUTH" "https://api.vercel.com/v9/projects?teamId=$tid&limit=100" \
    | python3 -c 'import sys,json; d=json.load(sys.stdin); [print(p["id"], p["name"]) for p in d.get("projects",[])]'
  ids=$(curl -sS -H "$AUTH" "https://api.vercel.com/v9/projects?teamId=$tid&limit=100" \
    | python3 -c 'import sys,json; print(" ".join(p["id"] for p in json.load(sys.stdin).get("projects",[])))')
  for pid in $ids; do
    curl -sS -H "$AUTH" "https://api.vercel.com/v9/projects/$pid/domains?teamId=$tid" \
      | pid="$pid" tid="$tid" python3 -c '
import sys, json, os
d = json.load(sys.stdin)
names = [x.get("name") for x in d.get("domains", [])]
if any("grupolivelab" in (n or "") for n in names):
    print("FOUND on project", os.environ["pid"], "team", os.environ["tid"], names)
elif names:
    print("domains on", os.environ["pid"], names[:5])
'
  done
done


echo "=== resolve deployment (no teamId) ==="
DEP_JSON2=$(curl -sS -H "$AUTH" "https://api.vercel.com/v13/deployments/${DEPLOY_ID}" || true)
echo "$DEP_JSON2" | python3 -c 'import sys,json
try:d=json.load(sys.stdin)
except Exception as e: print("parse",e); raise SystemExit
print("id", d.get("id") or d.get("uid")); print("url", d.get("url")); print("readyState", d.get("readyState")); print("error", d.get("error"))' || true
if [ -z "${DEP_HOST:-}" ]; then
  DEP_HOST=$(echo "$DEP_JSON2" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("url") or "")' 2>/dev/null || true)
fi

echo "=== attempt assign domain to deployment via aliases API ==="
if [ -n "${DEP_HOST:-}" ]; then
  curl -sS -H "$AUTH" -H 'Content-Type: application/json'     -d "{\"alias\":\"${DOMAIN}\"}"     "https://api.vercel.com/v2/deployments/${DEPLOY_ID}/aliases?teamId=${VERCEL_ORG_ID}" | json || true
  curl -sS -H "$AUTH" -H 'Content-Type: application/json'     -d "{\"alias\":\"${DOMAIN}\"}"     "https://api.vercel.com/v2/deployments/${DEPLOY_ID}/aliases" | json || true
fi

echo "=== domain verification status on project ==="
curl -sS -H "$AUTH"   "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${DOMAIN}?teamId=${VERCEL_ORG_ID}" | json || true

echo "=== live version checks ==="
echo -n "custom: "; curl -sS -H 'Cache-Control: no-cache' "https://${DOMAIN}/version.json?cb=$(date +%s)" || true
echo
echo -n "alias:  "; curl -sS -H 'Cache-Control: no-cache' "https://liveshop-saas-frontend-react.vercel.app/version.json?cb=$(date +%s)" || true
echo
