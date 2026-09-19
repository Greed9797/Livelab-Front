# react-app/src/components/dashboard/RankingPodium.tsx

- Subject · type · L6-L6 — type Subject = 'apresentadora' | 'marca' | 'unidade'
- Props · type · L8-L15 — type Props = { data: JsonRecord[] subject: Subject valueKey?: string valueLabel?: string metaKey?: string metaLabel?: string }
- getName · function · L17-L19 — function getName(item: JsonRecord, subject: Subject): string
- initials · function · L21-L26 — function initials(name: string): string
- getSubjectImage · function · L28-L30 — function getSubjectImage(item: JsonRecord, subject: Subject): string
- PodiumCard · function · L32-L119 — function PodiumCard({ item, place, subject, valueKey, valueLabel, metaKey, metaLabel }: { item: JsonRecord place: 1 | 2 | 3 subject: Subject valueKey: string valueLabel: string metaKey?: string metaLabel?: string })
- RankingPodium · function · L121-L159 — function RankingPodium({ data, subject, valueKey = 'gmv_total', valueLabel = 'GMV', metaKey, metaLabel }: Props)
