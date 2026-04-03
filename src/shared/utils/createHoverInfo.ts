interface HoverInfoOptions {
  label: string;
  content: string[];
  iconText?: string;
}

export function createHoverInfo(containerEl: HTMLElement, options: HoverInfoOptions): HTMLElement {
  const wrapper = containerEl.createDiv('sd-hover-info');
  const trigger = wrapper.createEl('button', {
    cls: 'sd-hover-info__trigger',
    text: options.iconText ?? 'i',
    attr: {
      type: 'button',
      'aria-label': options.label,
    },
  });

  const panel = wrapper.createDiv('sd-hover-info__panel');
  options.content.forEach(line => {
    panel.createDiv({
      cls: 'sd-hover-info__line',
      text: line,
    });
  });

  trigger.onClickEvent(event => {
    event.preventDefault();
  });

  return wrapper;
}
