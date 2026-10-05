import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/utils/colors';

export type BarDatum = {
  label: string;
  value: number; // v centoch
  color: string;
};

type Props = {
  data: BarDatum[];
  height?: number;
  showValues?: boolean; // pri veľa úzkych stĺpcoch sa hodnoty nad nimi prekrývajú, vtedy ich vypneme
};

const TOP_PADDING = 18; // miesto na hodnotu nad najvyšším stĺpcom
const BOTTOM_PADDING = 22; // miesto na popisky pod stĺpcami

// Stĺpce sú krátke zaokrúhlené hodnoty; presné sumy sú v zozname pod grafom.
function shortAmount(cents: number): string {
  const euros = cents / 100;
  return euros >= 100 ? `${Math.round(euros)} €` : `${euros.toFixed(1).replace('.', ',')} €`;
}

function shortLabel(label: string): string {
  return label.length > 8 ? `${label.slice(0, 7)}…` : label;
}

// Jednoduchý stĺpcový graf. Šírku zistíme až po rozložení obrazovky (onLayout).
export function BarChart({ data, height = 200, showValues = true }: Props) {
  const [width, setWidth] = useState(0);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const plotHeight = height - TOP_PADDING - BOTTOM_PADDING;
  const slot = data.length > 0 ? width / data.length : 0;
  const barWidth = Math.min(slot * 0.6, 44);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={styles.container}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((item, index) => {
            const barHeight = (item.value / maxValue) * plotHeight;
            const x = index * slot + (slot - barWidth) / 2;
            const y = TOP_PADDING + plotHeight - barHeight;
            const centerX = index * slot + slot / 2;
            return (
              <G key={item.label + index}>
                <Rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={item.color} />
                {/* Prázdne stĺpce (napr. mesiac bez dokladov) nemajú popisovať hodnotu 0. */}
                {showValues && item.value > 0 && (
                  <SvgText x={centerX} y={y - 5} fontSize={10} fill={colors.text} textAnchor="middle">
                    {shortAmount(item.value)}
                  </SvgText>
                )}
                <SvgText x={centerX} y={height - 6} fontSize={10} fill={colors.muted} textAnchor="middle">
                  {shortLabel(item.label)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
});
