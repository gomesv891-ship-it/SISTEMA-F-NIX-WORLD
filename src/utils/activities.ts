import { ClientActivity, ClientRecord } from '../types';

/**
 * Loads all real activities for a specific client from persistent storage.
 * Organizes strictly from most recent to oldest.
 */
export function getClientActivities(
  clientId: string,
  client?: ClientRecord | null
): ClientActivity[] {
  let list: ClientActivity[] = [];
  try {
    const raw = localStorage.getItem('fenix_activities_db');
    if (raw) {
      const parsed: ClientActivity[] = JSON.parse(raw);
      list = parsed.filter((item) => item.clientId === clientId);
    }
  } catch {
    list = [];
  }

  // Ensure the client's real initial registration event is represented if not already explicitly logged
  if (client && !list.some((a) => a.type === 'cadastro')) {
    const regDate = client.registeredAt ? new Date(client.registeredAt) : new Date();
    const validDate = isNaN(regDate.getTime()) ? new Date() : regDate;
    const dateFormatted = validDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = validDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const regActivity: ClientActivity = {
      id: `act_reg_${client.id}`,
      clientId: client.id,
      type: 'cadastro',
      title: 'Cliente cadastrado no sistema',
      description: `Cadastro inicial realizado como ${client.clientType || 'Cliente'}.`,
      date: dateFormatted,
      time: timeFormatted,
      userName: client.registeredBy || 'Vanessa Gomes',
      relevantInfo: client.notes ? `Obs: ${client.notes}` : undefined,
      timestamp: validDate.getTime(),
    };
    list.push(regActivity);
  }

  // Strictly organize from most recent to oldest
  list.sort((a, b) => b.timestamp - a.timestamp);

  return list;
}

/**
 * Adds a new activity record to the persistent database linked to a specific client.
 */
export function addClientActivity(
  activity: Omit<ClientActivity, 'id' | 'timestamp'> & { timestamp?: number }
): ClientActivity {
  const now = new Date();
  const timestamp = activity.timestamp || now.getTime();
  const time =
    activity.time ||
    now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const newActivity: ClientActivity = {
    ...activity,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    time,
    timestamp,
  };

  try {
    const raw = localStorage.getItem('fenix_activities_db');
    const currentList: ClientActivity[] = raw ? JSON.parse(raw) : [];
    currentList.unshift(newActivity);
    localStorage.setItem('fenix_activities_db', JSON.stringify(currentList));
    window.dispatchEvent(
      new CustomEvent('fenix_activities_updated', {
        detail: { clientId: activity.clientId },
      })
    );
  } catch (err) {
    console.error('Error saving activity:', err);
  }

  return newActivity;
}
