#!/usr/bin/env bash
# Detiene lo que levantó nube.sh. Córrelo como comando aparte (si va en la misma línea que otros, el patrón puede matar tu shell).
for p in $(ps -eo pid,args | awk '/next-serve[r]|node .*supabase-fals[o]|node .*anthropic-lent[o]/ {print $1}'); do kill $p 2>/dev/null; done
true
