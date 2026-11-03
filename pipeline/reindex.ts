/** Ricostruisce public/data/index.json da tutte le edizioni salvate (npm run reindex). */
import { reindex } from './store';

reindex().then((n) => console.log(`📇 Indice ricostruito: ${n} edizioni`));
