import { createExerciseEdits } from './editsState'
import { createEditsStorage } from './editsStorage'

// 全应用共用一份存档，缓存的多个实验页面不会用旧快照覆盖彼此。
const sharedEdits = createExerciseEdits(createEditsStorage(import.meta.env.BASE_URL, import.meta.env.DEV))
if (import.meta.hot) import.meta.hot.dispose(sharedEdits.dispose)
export const useExerciseEdits = () => sharedEdits
