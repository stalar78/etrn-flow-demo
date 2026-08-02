import type {
  ActorRole,
  ShipmentState,
  ShipmentWorkflowAction
} from "../api/etrn-flow-api";

export const shipmentStateLabels: Record<ShipmentState, string> = {
  draft: "Черновик",
  ready_for_dispatch: "Готово к отправке",
  awaiting_loading: "Ожидает прибытия на погрузку",
  loading: "Погрузка",
  in_transit: "В пути",
  awaiting_unloading: "Ожидает разгрузки",
  unloading: "Разгрузка",
  awaiting_confirmation: "Ожидает подтверждения",
  completed: "Завершено",
  attention_required: "Требует внимания",
  cancelled: "Отменено"
};

export const actorRoleLabels: Record<ActorRole, string> = {
  dispatcher: "Диспетчер",
  warehouse: "Склад",
  driver: "Водитель",
  consignee: "Грузополучатель",
  manager: "Менеджер"
};

export const actionLabels: Record<ShipmentWorkflowAction, string> = {
  prepareDispatch: "Подготовить к отправке",
  dispatch: "Отправить на погрузку",
  markVehicleArrived: "Подтвердить прибытие автомобиля",
  completeLoading: "Завершить погрузку",
  cancel: "Отменить перевозку"
};

export const eventTypeLabels: Record<string, string> = {
  shipment_created: "Демо-перевозка создана",
  dispatch: "Отправлено на погрузку",
  mark_vehicle_arrived: "Автомобиль прибыл",
  markVehicleArrived: "Автомобиль прибыл",
  complete_loading: "Погрузка завершена",
  completeLoading: "Погрузка завершена",
  arrive_for_unloading: "Прибыло к разгрузке",
  start_unloading: "Разгрузка началась",
  complete_unloading: "Разгрузка завершена",
  complete_shipment: "Перевозка завершена",
  prepareDispatch: "Подготовлено к отправке",
  cancel: "Перевозка отменена"
};

export type WorkflowActionOption = {
  action: ShipmentWorkflowAction;
  actorRole: ActorRole;
  label: string;
  roleLabel: string;
};

export const workflowActionsByState: Record<ShipmentState, WorkflowActionOption[]> = {
  draft: [],
  ready_for_dispatch: [],
  awaiting_loading: [
    {
      action: "markVehicleArrived",
      actorRole: "warehouse",
      label: actionLabels.markVehicleArrived,
      roleLabel: actorRoleLabels.warehouse
    }
  ],
  loading: [],
  in_transit: [],
  awaiting_unloading: [],
  unloading: [],
  awaiting_confirmation: [],
  completed: [],
  attention_required: [],
  cancelled: []
};

export const apiErrorMessages: Record<string, string> = {
  invalid_shipment_id: "Не удалось открыть перевозку: некорректный идентификатор.",
  invalid_transition_request: "Запрос действия заполнен некорректно.",
  shipment_not_found: "Перевозка не найдена в текущем демо-сеансе.",
  transition_forbidden: "Выбранная роль не может выполнить это действие.",
  invalid_transition: "Это действие больше недоступно для текущего состояния перевозки.",
  transition_conflict: "Состояние перевозки уже изменилось. Данные обновлены.",
  transition_unavailable: "Не удалось выполнить действие. Повторите попытку позже.",
  guest_session_unavailable: "Не удалось подготовить демо-сеанс. Повторите попытку.",
  demo_bootstrap_unavailable: "Не удалось создать демо-данные. Повторите попытку.",
  shipment_list_unavailable: "Не удалось загрузить список перевозок.",
  shipment_detail_unavailable: "Не удалось загрузить карточку перевозки.",
  request_failed: "API временно недоступен. Проверьте запуск сервера.",
  invalid_response: "API вернул неожиданный ответ."
};

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
