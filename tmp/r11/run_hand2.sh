#!/bin/bash
# usage: bash tmp/r11/run_hand2.sh <tag>   初心者のまねを 2 回（実時間）→ 人の速さ seed1-3 を回し、tmp/r11/<tag>_report.txt にまとめる
cd /c/Users/yuton/workspace/ios-apps || exit 1
T=$1
for k in 1 2; do (cd tmp/critic && python hand.py r11hand_${T}$k 180 12 > ../r11/hand_${T}$k.log 2>&1); done
for s in 1 2 3; do python tools/proto/sukuu_check.py sim --seconds 700 --human --seed $s --out r11_${T}_h$s.json > tmp/r11/${T}_h$s.txt 2>&1 & done
python tools/proto/sukuu_check.py sim --seconds 550 --seed 1 --out r11_${T}_f1.json > tmp/r11/${T}_f1.txt 2>&1 &
wait
{
  for k in 1 2; do echo "== hand $k"; grep errors tmp/r11/hand_${T}$k.log; python tmp/r11/hand_check.py tmp/critic/r11hand_${T}$k; done
  python tmp/r8/summ.py tmp/r11/${T}_h*.txt tmp/r11/${T}_f1.txt | grep -v "buys w\|loop2_new\|max_gap"
  python tmp/r11/loss.py proto/sukuu-html5/rec/r11_${T}_*.json
  echo DONE
} > tmp/r11/${T}_report.txt 2>&1
