import { mount } from '@vue/test-utils'
import AuditForm from '@/components/audit/AuditForm.vue'
import { describe, it, expect } from 'vitest'

function getSubmit(wrapper: ReturnType<typeof mount>) {
  const vm = wrapper.vm as any
  return vm.submit ?? vm.$?.exposed?.submit
}

const VALID_INITIAL = {
  title: 'Site de test',
  url: 'https://example.com',
  date: '2024-01-01',
  auditor: 'Alice',
  generalComment: 'Contexte',
}

describe('AuditForm', () => {
  it('emits submit with correct payload when form is valid', async () => {
    const wrapper = mount(AuditForm, { props: { initial: VALID_INITIAL } })
    await getSubmit(wrapper)()
    expect(wrapper.emitted('submit')).toHaveLength(1)
    const payload = wrapper.emitted('submit')![0][0] as any
    expect(payload.title).toBe('Site de test')
    expect(payload.url).toBe('https://example.com')
    expect(payload.auditor).toBe('Alice')
    expect(payload.generalComment).toBe('Contexte')
  })

  it('does not emit submit when required fields are missing', async () => {
    const wrapper = mount(AuditForm)
    await getSubmit(wrapper)()
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('does not emit submit when URL is invalid', async () => {
    const wrapper = mount(AuditForm, {
      props: {
        initial: { ...VALID_INITIAL, url: 'not-a-url' },
      },
    })
    await getSubmit(wrapper)()
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('trims whitespace from title and auditor before emitting', async () => {
    const wrapper = mount(AuditForm, {
      props: {
        initial: { ...VALID_INITIAL, title: '  Padded  ', auditor: '  Bob  ' },
      },
    })
    await getSubmit(wrapper)()
    const payload = wrapper.emitted('submit')![0][0] as any
    expect(payload.title).toBe('Padded')
    expect(payload.auditor).toBe('Bob')
  })

  it('omits generalComment from payload when blank', async () => {
    const wrapper = mount(AuditForm, {
      props: { initial: { ...VALID_INITIAL, generalComment: '' } },
    })
    await getSubmit(wrapper)()
    const payload = wrapper.emitted('submit')![0][0] as any
    expect(payload.generalComment).toBeUndefined()
  })

  it('hides action buttons when hideActions is true', () => {
    const wrapper = mount(AuditForm, { props: { hideActions: true } })
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
  })

  it('updates form when initial prop changes', async () => {
    const wrapper = mount(AuditForm, { props: { initial: VALID_INITIAL } })
    await wrapper.setProps({
      initial: { ...VALID_INITIAL, title: 'Nouveau titre', url: 'https://new.example.com' },
    })
    await getSubmit(wrapper)()
    const payload = wrapper.emitted('submit')![0][0] as any
    expect(payload.title).toBe('Nouveau titre')
    expect(payload.url).toBe('https://new.example.com')
  })
})