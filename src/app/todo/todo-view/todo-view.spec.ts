import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoView } from './todo-view';

describe('TodoView', () => {
  let component: TodoView;
  let fixture: ComponentFixture<TodoView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodoView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
