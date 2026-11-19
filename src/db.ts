import Dexie, { type Table } from 'dexie';
import type { Drink, Photo, Tasting } from './types';

class SullogDB extends Dexie {
  drinks!: Table<Drink, string>;
  tastings!: Table<Tasting, string>;
  photos!: Table<Photo, string>;

  constructor() {
    super('sullog');
    this.version(1).stores({
      drinks: 'id, category, name, barcode, updatedAt',
      tastings: 'id, drinkId, date',
      photos: 'id',
    });
  }
}

export const db = new SullogDB();
