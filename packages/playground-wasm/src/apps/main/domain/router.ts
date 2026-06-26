import {reactive} from '@vue/reactivity';

const api = reactive({
  currentRoute: {path: '/home'},
  push(parameters: {path: string}) {
    this.currentRoute.path = parameters.path;
  },
});

export function useRouter() {
  return api;
}
