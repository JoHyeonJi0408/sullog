import { useRoute } from './router';
import { ListScreen } from './screens/ListScreen';
import { DrinkFormScreen } from './screens/DrinkFormScreen';
import { DetailScreen } from './screens/DetailScreen';
import { TastingScreen } from './screens/TastingScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  const r = useRoute();
  switch (r.name) {
    case 'new':
      return <DrinkFormScreen key={"new" + (r.barcode ?? "")} initialBarcode={r.barcode} />;
    case 'editDrink':
      return <DrinkFormScreen key={'e' + r.id} id={r.id} />;
    case 'detail':
      return <DetailScreen id={r.id} />;
    case 'tasting':
      return <TastingScreen key={r.drinkId + (r.tastingId ?? 'new')} drinkId={r.drinkId} tastingId={r.tastingId} />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <ListScreen />;
  }
}
