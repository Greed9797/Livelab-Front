# react-app/src/utils/presenters.ts

- PresenterOption · type · L4-L7 — type PresenterOption = { value: string label: string }
- isPresenterRole · function · L9-L12 — function isPresenterRole(papel: unknown): boolean
- presenterProfileId · function · L14-L17 — function presenterProfileId(item: JsonRecord | null | undefined): string
- presenterDisplayName · function · L19-L22 — function presenterDisplayName(item: JsonRecord | null | undefined): string
- toPresenterOptions · function · L24-L39 — function toPresenterOptions(rows: JsonRecord[] = [], { includeInactive = true } = {}): PresenterOption[]
