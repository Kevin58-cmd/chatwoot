const state = {
  show: false,
  title: '',
  placeholder: '',
  defaultValue: '',
  confirmButtonLabel: '',
  cancelButtonLabel: '',
  onConfirm: null,
};

const mutations = {
  openInputDialog(_state, payload) {
    Object.assign(_state, payload);

    _state.show = true;
  },
  closeInputDialog(_state) {
    _state.show = false;
    _state.onConfirm = null;
  },
};

const actions = {
  openInputDialog({ commit }, payload) {
    commit('openInputDialog', payload);
  },
  closeInputDialog({ commit }) {
    commit('closeInputDialog');
  },
};

const getters = {
  show: _state => _state.show,
  title: _state => _state.title,
  placeholder: _state => _state.placeholder,
  defaultValue: _state => _state.defaultValue,
  confirmButtonLabel: _state => _state.confirmButtonLabel || '',
  cancelButtonLabel: _state => _state.cancelButtonLabel || '',
  onConfirm: _state => _state.onConfirm,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
