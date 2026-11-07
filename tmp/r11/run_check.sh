#!/bin/bash
# usage: bash tmp/r11/run_check.sh <tag>   人の速さ seed1-3・速い bot・初心者のまねを順に回し、tmp/r11/<tag>_report.txt にまとめる
cd /c/Users/yuton/workspace/ios-apps || exit 1
T=$1
for s in 1 2 3; do python tools/proto/sukuu_check.py sim --seconds 700 --human --seed $s --out r11_${T}_h$s.json > tmp/r11/${T}_h$s.txt 2>&1 & done
python tools/proto/sukuu_check.py sim --seconds 550 --seed 1 --out r11_${T}_f1.json > tmp/r11/${T}_f1.txt 2>&1 &
wait
(cd tmp/critic && python hand.py r11hand_${T} 180 12 > ../r11/hand_${T}.log 2>&1)
{
  python tmp/r8/summ.py tmp/r11/${T}_*.txt | grep -v "buys w [1-4]\|loop2_new\|max_gap"
  python tmp/r11/loss.py proto/sukuu-html5/rec/r11_${T}_*.json
  echo "== hand"; grep errors tmp/r11/hand_${T}.log
  python tmp/r11/hand_check.py tmp/critic/r11hand_${T}
  echo DONE
} > tmp/r11/${T}_report.txt 2>&1
