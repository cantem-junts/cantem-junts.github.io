#!/bin/sh
# Després de lot.py: posa les cançons passades a mà (a-ma/) i els retocs puntuals
# que l'automàtic no fa bé. Ús: scripts/migracio/retocs.sh (des de l'arrel).
set -e
cp scripts/migracio/a-ma/*.cho cancons/
# Rètol solt de la primera diapositiva (era una imatge).
sed -i '/{comment: Lami re la}/,+1d' cancons/crist-ha-ressuscitat.cho
# Dues línies on l'original barrejava acords i lletra.
sed -i 's/^si m LA\. \t MI LA\. 7 veniu-hi, veniu-hi cap a Betlem:$/[si m]veniu-hi, [LA]veniu-hi [MI]cap a Be[LA7]tlem:/; s/^do# m SI7 \t FA#7 SI7 veniu-hi, veniu-hi cap a Betlem:$/[do# m]veniu-hi, [SI7]veniu-hi [FA#7]cap a Be[SI7]tlem:/' cancons/adeste-fideles.cho
# Línia que s'aparella amb dues files: la negreta hi queda desplaçada una lletra.
sed -i 's|^és el \[la\]S<b>e\[RE7 SOL\]nyo</b>r \* Senyor\.$|és el [la]Se[RE7 SOL]<b>nyor</b> * Se<b>nyor</b>.|' cancons/aclamem-el-senyor.cho
