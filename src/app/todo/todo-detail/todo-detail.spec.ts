import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TodoDetail } from './todo-detail';

describe('TodoDetail', () => {
  let component: TodoDetail;
  let fixture: ComponentFixture<TodoDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TodoDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
